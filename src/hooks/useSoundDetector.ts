import { useEffect, useRef, useState } from 'react'

interface Options {
  /** The live microphone stream to analyse. */
  stream: MediaStream | null
  /** Called once the level has been held above threshold for `holdMs`. */
  onDetect?: () => void
  /** How far above the measured noise floor (RMS amplitude) the level must rise. */
  threshold?: number
  /** How long the level must stay above threshold, continuously, in ms. */
  holdMs?: number
  /** How long to sample the quiet room before listening, in ms. */
  calibrationMs?: number
  /**
   * Per-frame multiplier for how the meter falls when input quiets. Closer to 1
   * means slower decay, so brief dips between words/claps don't drop you below
   * the line and reset the hold timer.
   */
  decay?: number
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

// RMS amplitude that maps to a full meter once the noise floor is removed.
const FULL_SCALE = 0.12

/**
 * Listens to the mic, learns the room's noise floor for `calibrationMs`, then
 * reports a live level and hold-progress (via refs, updated every frame). Fires
 * `onDetect` once the level stays above `threshold` for `holdMs` without dipping.
 *
 * `thresholdNorm` is the threshold expressed in the meter's 0..1 scale, so the
 * meter can draw the line the player has to clear.
 */
export function useSoundDetector({
  stream,
  onDetect,
  threshold = 0.04,
  holdMs = 500,
  calibrationMs = 800,
  decay = 0.96,
}: Options) {
  const thresholdNorm = Math.min(1, threshold / FULL_SCALE)

  const levelRef = useRef(0)
  const holdRef = useRef(0)
  const [calibrating, setCalibrating] = useState(true)
  const [detected, setDetected] = useState(false)

  const onDetectRef = useRef(onDetect)
  onDetectRef.current = onDetect

  useEffect(() => {
    if (!stream) return

    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    const ctx = new Ctor!()
    void ctx.resume()

    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)

    const buf = new Float32Array(analyser.fftSize)
    const start = performance.now()
    let floorSum = 0
    let floorCount = 0
    let noiseFloor = 0
    let calibrated = false
    let holdStart: number | null = null
    let fired = false
    let raf = 0

    const tick = () => {
      analyser.getFloatTimeDomainData(buf)

      let sumSq = 0
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i]
      const rms = Math.sqrt(sumSq / buf.length)
      const now = performance.now()

      if (now - start < calibrationMs) {
        floorSum += rms
        floorCount++
      } else {
        if (!calibrated) {
          calibrated = true
          noiseFloor = floorCount ? floorSum / floorCount : 0
          setCalibrating(false)
        }

        const above = Math.max(0, rms - noiseFloor)

        // Fast attack, slow decay so the meter "bounces" rather than flickers.
        const target = Math.min(1, above / FULL_SCALE)
        levelRef.current = target > levelRef.current ? target : levelRef.current * decay

        // Hold against the *visible* (decayed) level so the slow fall gives the
        // player grace through brief dips. Any real drop below the line resets.
        if (levelRef.current >= thresholdNorm) {
          if (holdStart === null) holdStart = now
          const held = now - holdStart
          holdRef.current = Math.min(1, held / holdMs)
          if (!fired && held >= holdMs) {
            fired = true
            setDetected(true)
            onDetectRef.current?.()
          }
        } else {
          holdStart = null
          holdRef.current = 0
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      void ctx.close()
    }
  }, [stream, threshold, holdMs, calibrationMs, decay, thresholdNorm])

  return {
    levelRef,
    holdRef,
    thresholdNorm,
    calibrating,
    detected,
  }
}
