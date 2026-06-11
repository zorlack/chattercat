import { useEffect, useRef, useState } from 'react'

interface Options {
  /** Milliseconds between revealed characters. */
  speed?: number
  /** Called once for each newly revealed character. */
  onChar?: (ch: string) => void
  /** When false, typing pauses. */
  enabled?: boolean
}

/**
 * Reveals `text` one character at a time. Resets whenever `text` changes,
 * so swapping the line restarts the effect. `onChar` fires per character
 * (used to drive the codec boops).
 */
export function useTypewriter(text: string, { speed = 38, onChar, enabled = true }: Options = {}) {
  const [count, setCount] = useState(0)

  // Keep onChar in a ref so changing it doesn't restart the timer.
  const onCharRef = useRef(onChar)
  onCharRef.current = onChar

  useEffect(() => {
    setCount(0)
  }, [text])

  useEffect(() => {
    if (!enabled || count >= text.length) return
    const id = setTimeout(() => {
      onCharRef.current?.(text[count])
      setCount((c) => c + 1)
    }, speed)
    return () => clearTimeout(id)
  }, [count, text, speed, enabled])

  return {
    displayed: text.slice(0, count),
    done: count >= text.length,
    /** Instantly reveal the rest of the line. */
    skip: () => setCount(text.length),
  }
}
