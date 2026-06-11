import { useEffect, useRef, useState } from 'react'
import { cropUtterance } from '../audio/cropUtterance'
import { toRadio, type RadioFormat } from '../audio/radio'

export type RecorderPhase = 'idle' | 'listening' | 'recording' | 'processing' | 'done' | 'error'

/** The cropped, narrow-band radio utterance as raw mono PCM. */
export interface Clip {
  samples: Float32Array
  sampleRate: number
}

interface Options {
  stream: MediaStream | null
  /** RMS above the noise floor that counts as speech. */
  threshold?: number
  /** Trailing silence (ms) after speech that ends the utterance. */
  silenceMs?: number
  /** Hard cap on a single recording, in ms. */
  maxMs?: number
  /** Quiet-room sampling time before listening, in ms. */
  calibrationMs?: number
  /** Narrow-band radio format applied to the recording. */
  radio?: RadioFormat
  /** When false, the recorder stays idle (e.g. while the prompt is still typing). */
  enabled?: boolean
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

const FULL_SCALE = 0.12
const DEFAULT_RADIO: RadioFormat = { lowCut: 300, highCut: 3000, sampleRate: 8000 }

/**
 * Records one spoken utterance: calibrates the room level, waits for speech,
 * stops on trailing silence, then thins it to a narrow-band radio signal
 * (bandpass + downsample) and crops tightly. Exposes the raw clip so callers
 * can re-render effects on it. Call reset() to record again.
 */
export function useUtteranceRecorder({
  stream,
  threshold = 0.03,
  silenceMs = 700,
  maxMs = 6000,
  calibrationMs = 600,
  radio = DEFAULT_RADIO,
  enabled = true,
}: Options) {
  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const [clip, setClip] = useState<Clip | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runId, setRunId] = useState(0)

  const levelRef = useRef(0)

  const reset = () => {
    setClip(null)
    setError(null)
    levelRef.current = 0
    setRunId((n) => n + 1)
  }

  useEffect(() => {
    if (!stream || !enabled) {
      setPhase('idle')
      return
    }

    let cancelled = false
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    const ctx = new Ctor!()
    void ctx.resume()

    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)

    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = async () => {
      setPhase('processing')
      try {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
        const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())

        // Thin to a narrow-band radio signal (bandpass + downsample), then crop.
        const radioBuffer = await toRadio(decoded, radio)
        const { samples, sampleRate } = cropUtterance(radioBuffer)
        if (cancelled) return
        if (samples.length === 0) {
          setError("I didn't catch that.")
          setPhase('error')
          return
        }
        setClip({ samples, sampleRate })
        setPhase('done')
      } catch {
        if (!cancelled) {
          setError('Something went wrong recording that.')
          setPhase('error')
        }
      }
    }

    const start = performance.now()
    let floorSum = 0
    let floorCount = 0
    let noiseFloor = 0
    let calibrated = false
    let hasSpeech = false
    let lastAbove = 0
    let raf = 0

    const stopRecording = () => {
      cancelAnimationFrame(raf)
      if (recorder.state === 'recording') recorder.stop()
    }

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
          recorder.start()
          setPhase('listening')
        }

        const above = Math.max(0, rms - noiseFloor)
        const target = Math.min(1, above / FULL_SCALE)
        levelRef.current = target > levelRef.current ? target : levelRef.current * 0.92

        if (above >= threshold) {
          lastAbove = now
          if (!hasSpeech) {
            hasSpeech = true
            setPhase('recording')
          }
        }

        if (hasSpeech && now - lastAbove > silenceMs) {
          stopRecording()
          return
        }
        if (now - start > maxMs) {
          stopRecording()
          return
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* already stopped */
      }
      source.disconnect()
      void ctx.close()
    }
  }, [stream, runId, threshold, silenceMs, maxMs, calibrationMs, radio, enabled])

  return { phase, levelRef, clip, radio, error, reset }
}
