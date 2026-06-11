import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { playTone } from '../audio/tone'

export interface ToneTarget {
  label: string
  freq: number
}

interface Props {
  /** Live pitch source (Hz) shared across challenges. */
  pitchRef: MutableRefObject<number>
  /** Blank the pitch briefly (while our reference tone plays). */
  suppress: (ms: number) => void
  target: ToneTarget
  variant?: 'circle' | 'bar'
  holdMs?: number
  toleranceCents?: number
  onComplete: () => void
}

/**
 * Sing/hum the target note to fill this control; completes after holding it for
 * `holdMs`. Octave-agnostic match, with grace for brief dips. Tap to hear the
 * reference tone. 'circle' fills bottom-up; 'bar' is a button-height fill.
 */
export function ToneChallenge({
  pitchRef,
  suppress,
  target,
  variant = 'circle',
  holdMs = 2000,
  toleranceCents = 90,
  onComplete,
}: Props) {
  const fillRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const doneRef = useRef(false)
  const [done, setDone] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = now - last
      last = now

      if (!doneRef.current) {
        const f = pitchRef.current
        let match = false
        if (f > 0) {
          let cents = ((1200 * Math.log2(f / target.freq)) % 1200 + 1200) % 1200
          if (cents > 600) cents -= 1200
          match = Math.abs(cents) <= toleranceCents
        }
        progressRef.current = match
          ? Math.min(1, progressRef.current + dt / holdMs)
          : Math.max(0, progressRef.current - (dt / holdMs) * 0.4)
        if (progressRef.current >= 1) {
          doneRef.current = true
          setDone(true)
          onCompleteRef.current()
        }
      }

      const el = fillRef.current
      if (el) {
        const pct = `${progressRef.current * 100}%`
        if (variant === 'bar') el.style.width = pct
        else el.style.height = pct
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pitchRef, target.freq, holdMs, toleranceCents, variant])

  const play = () => {
    playTone(target.freq, 1000)
    suppress(1300)
  }

  if (variant === 'bar') {
    return (
      <button className={`tonebar ${done ? 'tonebar--done' : ''}`} onClick={play} type="button">
        <div className="tonebar__fill" ref={fillRef} />
        <span className="tonebar__label">♪ Hum {target.label} to continue →</span>
      </button>
    )
  }

  return (
    <button className={`tone ${done ? 'tone--done' : ''}`} onClick={play} type="button">
      <div className="tone__fill" ref={fillRef} />
      <span className="tone__label">
        {target.label}
        {done && ' ✓'}
      </span>
    </button>
  )
}
