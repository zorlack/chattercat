import { ToneChallenge, type ToneTarget } from './ToneChallenge'
import { useLivePitch } from '../hooks/useLivePitch'

interface Props {
  stream: MediaStream | null
  target: ToneTarget
  /** Hold time, in ms. Short by design — it's a gag, not a test. */
  holdMs?: number
  onContinue: () => void
}

/**
 * A "continue" gate you hum instead of click. Reusable across stages as a
 * running joke once the player knows the ToneChallenge mechanic.
 */
export function HumToContinue({ stream, target, holdMs = 500, onContinue }: Props) {
  const { pitchRef, suppress } = useLivePitch(stream)
  return (
    <ToneChallenge
      pitchRef={pitchRef}
      suppress={suppress}
      target={target}
      variant="bar"
      holdMs={holdMs}
      onComplete={onContinue}
    />
  )
}
