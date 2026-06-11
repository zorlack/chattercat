import { useState, type ReactNode } from 'react'
import { unlockAudio } from '../audio/engine'

/**
 * Gates the whole app behind one user gesture so the AudioContext can produce
 * sound (browsers start it suspended). Shown for any entry point — including
 * deep links like /s3 — so Chattercat's voice always works.
 */
export function AudioGate({ children }: { children: ReactNode }) {
  const [armed, setArmed] = useState(false)

  if (armed) return <>{children}</>

  return (
    <div className="boot">
      <h1>🐱 Chattercat</h1>
      <p className="boot__hint">Incoming transmission…</p>
      <button
        className="boot__answer"
        onClick={() => {
          unlockAudio()
          setArmed(true)
        }}
      >
        📞 Answer the call
      </button>
    </div>
  )
}
