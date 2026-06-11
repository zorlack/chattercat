import type { ReactNode } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'
import { boop } from '../audio/codecVoice'

interface CodecProps {
  /** Who is speaking, shown above the line. */
  speaker: string
  /** Emoji (or any glyph) used as the speaker's portrait. */
  avatar: string
  /** The line currently being spoken. Changing it restarts the typing. */
  line: string
  /** The reply area. Varies per stage: choices now, mic/voice later. */
  children?: ReactNode
}

// Only letters/digits trigger a boop, so spaces and punctuation stay silent.
const BOOPABLE = /[a-z0-9]/i

/**
 * The conversational frame: speaker portrait + typewriter speech on top,
 * a reply slot below. The reply slot is revealed once the line finishes.
 */
export function Codec({ speaker, avatar, line, children }: CodecProps) {
  const { displayed, done, skip } = useTypewriter(line, {
    onChar: (ch) => {
      if (BOOPABLE.test(ch)) boop()
    },
  })

  return (
    <div className="codec">
      <div className="codec__screen" onClick={skip} title="Click to skip">
        <div className="codec__avatar" aria-hidden>
          {avatar}
        </div>
        <div className="codec__speech">
          <span className="codec__speaker">{speaker}</span>
          <p className="codec__line">
            {displayed}
            {!done && <span className="codec__caret">▍</span>}
          </p>
        </div>
      </div>

      <div className="codec__reply">{done ? children : <span className="codec__waiting">…</span>}</div>
    </div>
  )
}
