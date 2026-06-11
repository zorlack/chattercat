import { useEffect, useRef, useState } from 'react'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { LevelMeter } from '../components/LevelMeter'
import { ToneChallenge, type ToneTarget } from '../components/ToneChallenge'
import { getMicStream } from '../audio/mic'
import { useLivePitch } from '../hooks/useLivePitch'

const TARGETS: ToneTarget[] = [
  { label: 'C', freq: 261.63 },
  { label: 'G', freq: 392.0 },
]

const SILENCE_PROMPTS = ["I'm all ears…", 'Give me a hum!', "Don't be shy — sing it out!"]

// Octave-agnostic cents from the nearest target; sign = below/above.
function nearestCents(freq: number, targets: ToneTarget[]): number {
  let best = Infinity
  for (const t of targets) {
    let c = ((1200 * Math.log2(freq / t.freq)) % 1200 + 1200) % 1200
    if (c > 600) c -= 1200
    if (Math.abs(c) < Math.abs(best)) best = c
  }
  return best
}

// Stage 6: tone calibration. A live meter shows we're listening, and the cat
// drops ephemeral coaching hints while you find the pitch.
export function ToneCalibration({ advance, goTo }: StageProps) {
  const stream = getMicStream()
  const { pitchRef, levelRef, suppress } = useLivePitch(stream)
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set())
  const [hint, setHint] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)
  const calibrated = doneSet.size >= TARGETS.length

  // Latest set of uncalibrated targets the user should be aiming at.
  const activeTargetsRef = useRef<ToneTarget[]>(TARGETS)
  activeTargetsRef.current = TARGETS.filter((t) => !doneSet.has(t.label))

  // Once both are calibrated, celebrate briefly and move on (no continue gate).
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  useEffect(() => {
    if (!calibrated) return
    setHint('Calibrated! 🎉')
    const id = window.setTimeout(() => advanceRef.current(), 1100)
    return () => clearTimeout(id)
  }, [calibrated])

  // Coaching loop — only after the prompt finishes typing, so the codec boops
  // aren't read as singing.
  useEffect(() => {
    if (!stream || !armed || calibrated) return
    let silentMs = 0
    const id = setInterval(() => {
      const targets = activeTargetsRef.current
      if (!targets.length) return
      const f = pitchRef.current

      if (f <= 0) {
        // Keep nudging while silent; rotate the prompt slowly so it lingers
        // instead of flashing away.
        silentMs += 500
        if (silentMs >= 1500) {
          const idx = Math.floor((silentMs - 1500) / 5000) % SILENCE_PROMPTS.length
          setHint(SILENCE_PROMPTS[idx])
        }
        return
      }

      silentMs = 0
      const cents = nearestCents(f, targets)
      const a = Math.abs(cents)
      if (a <= 90) setHint("That's it — hold it!")
      else if (a <= 250) setHint(cents < 0 ? 'So close — nudge up!' : 'So close — nudge down!')
      else setHint(cents < 0 ? 'Higher! ⬆' : 'Lower! ⬇')
    }, 500)
    return () => clearInterval(id)
  }, [stream, armed, calibrated, pitchRef])

  const markDone = (label: string) => setDoneSet((s) => new Set(s).add(label))

  const line = !stream
    ? "I lost the mic — let's reconnect."
    : 'Tone calibration! Tap a circle to hear its note, then sing or hum it.'

  return (
    <Codec
      speaker="Chattercat"
      avatar={calibrated ? '😺' : '🐱'}
      line={line}
      onLineComplete={() => setArmed(true)}
      hint={stream ? (hint ?? undefined) : undefined}
    >
      {!stream ? (
        <ReplyChoices choices={[{ label: '← Reconnect mic', onSelect: () => goTo('mic') }]} />
      ) : (
        <div className="listen">
          <div className="tones">
            {TARGETS.map((t) => (
              <ToneChallenge
                key={t.label}
                pitchRef={pitchRef}
                suppress={suppress}
                target={t}
                variant="circle"
                onComplete={() => markDone(t.label)}
              />
            ))}
          </div>

          <LevelMeter levelRef={levelRef} />
        </div>
      )}
    </Codec>
  )
}
