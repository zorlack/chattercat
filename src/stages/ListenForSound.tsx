import { useState } from 'react'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { LevelMeter } from '../components/LevelMeter'
import { getMicStream } from '../audio/mic'
import { useSoundDetector } from '../hooks/useSoundDetector'

// Stage 2: the first audio-input experiment. Chattercat asks for a sound, we
// watch the mic level against the room's noise floor, and advance once we hear
// the user. The reply slot here is a live bounce meter instead of buttons.
export function ListenForSound({ advance, goTo }: StageProps) {
  const stream = getMicStream()
  const [heard, setHeard] = useState(false)
  const { levelRef, holdRef, thresholdNorm } = useSoundDetector({
    stream,
    onDetect: () => setHeard(true),
  })

  const line = !stream
    ? "Hmm, I lost the mic connection. Let's go back and reconnect."
    : heard
      ? 'I heard that! Loud and clear. Nice work, friendo.'
      : 'Now make some noise — and hold it above the line for half a second!'

  return (
    <Codec speaker="Chattercat" avatar={heard ? '😺' : '🐱'} line={line}>
      {!stream ? (
        <ReplyChoices choices={[{ label: '← Reconnect mic', onSelect: () => goTo('mic') }]} />
      ) : heard ? (
        <ReplyChoices choices={[{ label: 'Continue →', onSelect: advance }]} />
      ) : (
        <div className="listen">
          <LevelMeter levelRef={levelRef} thresholdNorm={thresholdNorm} holdRef={holdRef} />
          <span className="listen__hint">Hold above the line…</span>
        </div>
      )}
    </Codec>
  )
}
