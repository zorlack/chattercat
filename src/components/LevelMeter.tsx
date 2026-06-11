import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'

interface Props {
  /** Current input level, 0..1. */
  levelRef: MutableRefObject<number>
  /** Threshold position on the same 0..1 scale; draws a line to clear. */
  thresholdNorm?: number
  /** Hold progress, 0..1, shown as a separate bar that fills then completes. */
  holdRef?: MutableRefObject<number>
}

/**
 * A horizontal level meter. Reads the shared refs every animation frame and
 * paints them directly (scaleX / class toggles) — no React re-render per frame,
 * so the bounce and hold progress stay smooth.
 */
export function LevelMeter({ levelRef, thresholdNorm = 0, holdRef }: Props) {
  const fillRef = useRef<HTMLDivElement>(null)
  const holdFillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const paint = () => {
      const lvl = Math.max(0, Math.min(1, levelRef.current))
      const fill = fillRef.current
      if (fill) {
        fill.style.transform = `scaleX(${lvl})`
        fill.classList.toggle('meter__fill--armed', lvl >= thresholdNorm)
      }
      const holdFill = holdFillRef.current
      if (holdFill && holdRef) {
        holdFill.style.transform = `scaleX(${Math.max(0, Math.min(1, holdRef.current))})`
      }
      raf = requestAnimationFrame(paint)
    }
    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [levelRef, holdRef, thresholdNorm])

  return (
    <div className="meter-wrap" aria-hidden>
      <div className="meter">
        <div className="meter__fill" ref={fillRef} />
        {thresholdNorm > 0 && (
          <div className="meter__threshold" style={{ left: `${thresholdNorm * 100}%` }} />
        )}
      </div>
      {holdRef && (
        <div className="meter__hold">
          <div className="meter__hold-fill" ref={holdFillRef} />
        </div>
      )}
    </div>
  )
}
