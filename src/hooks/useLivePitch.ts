import { useEffect, useRef } from 'react'
import { autoCorrelate } from '../audio/pitch'

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

/**
 * Tracks the live sung/hummed pitch from the mic in `pitchRef` (Hz, or 0 when
 * silent), updated every frame. `suppress(ms)` blanks it briefly — used while a
 * reference tone is playing so its speaker bleed isn't read as the user.
 */
// RMS amplitude that maps to a full meter.
const FULL_SCALE = 0.12
// Minimum RMS to attempt pitch detection — above ambient room noise, so quiet
// rooms read as silent (0) rather than a garbage pitch.
const MIN_RMS = 0.02

export function useLivePitch(stream: MediaStream | null) {
  const pitchRef = useRef(0)
  const levelRef = useRef(0)
  const ignoreUntilRef = useRef(0)

  const suppress = (ms: number) => {
    ignoreUntilRef.current = performance.now() + ms
  }

  useEffect(() => {
    if (!stream) {
      pitchRef.current = 0
      return
    }

    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    const ctx = new Ctor!()
    void ctx.resume()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)

    let raf = 0
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)

      // Level meter (fast attack, slow decay) — always live, so the user can
      // see we're listening.
      let sumSq = 0
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i]
      const rms = Math.sqrt(sumSq / buf.length)
      const target = Math.min(1, rms / FULL_SCALE)
      levelRef.current = target > levelRef.current ? target : levelRef.current * 0.9

      // Pitch, unless a reference tone is sounding or the input is below the
      // noise gate.
      if (performance.now() >= ignoreUntilRef.current && rms >= MIN_RMS) {
        const f = autoCorrelate(buf, ctx.sampleRate)
        pitchRef.current = f > 0 ? f : 0
      } else {
        pitchRef.current = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      void ctx.close()
    }
  }, [stream])

  return { pitchRef, levelRef, suppress }
}
