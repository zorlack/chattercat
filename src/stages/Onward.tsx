import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { HumToContinue } from '../components/HumToContinue'
import { getMicStream } from '../audio/mic'

const C: { label: string; freq: number } = { label: 'C', freq: 261.63 }

// Stage 7: the running gag — now that you know the ToneChallenge mechanic, the
// "continue" button is replaced by a quick hum (half a second, barely a peep).
export function Onward({ advance, goTo }: StageProps) {
  const stream = getMicStream()

  const line = !stream
    ? "I lost the mic — let's reconnect."
    : "Calibrated! From here on, you don't click to continue… you hum. Just a little C. Barely a peep, promise."

  return (
    <Codec speaker="Chattercat" avatar="😺" line={line}>
      {!stream ? (
        <ReplyChoices choices={[{ label: '← Reconnect mic', onSelect: () => goTo('mic') }]} />
      ) : (
        <HumToContinue stream={stream} target={C} holdMs={500} onContinue={advance} />
      )}
    </Codec>
  )
}
