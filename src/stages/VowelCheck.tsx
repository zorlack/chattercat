import { useState } from 'react'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { PhraseChallenge } from '../components/PhraseChallenge'
import { HumToContinue } from '../components/HumToContinue'
import { getMicStream } from '../audio/mic'
import { judgeVowel } from '../audio/judgeVowel'

const HUM_C = { label: 'C', freq: 261.63 }

// Stage 8: capture "eee" then "ooo" vowel samples under a humorous pretext,
// judging each via PhraseChallenge, then hum to continue.
export function VowelCheck({ advance, goTo }: StageProps) {
  const stream = getMicStream()
  const [phase, setPhase] = useState<'eee' | 'ooo'>('eee')

  if (!stream) {
    return (
      <Codec speaker="Chattercat" avatar="🐱" line="I lost the mic — let's reconnect.">
        <ReplyChoices choices={[{ label: '← Reconnect mic', onSelect: () => goTo('mic') }]} />
      </Codec>
    )
  }

  if (phase === 'eee') {
    return (
      <PhraseChallenge
        key="eee"
        stream={stream}
        prompt="Ugh, my calibration is glitching. Quick — say this for me:"
        phrase="weasel weevil easle"
        judge={(clip) => judgeVowel(clip, 'eee')}
      >
        <ReplyChoices choices={[{ label: 'Next sample →', onSelect: () => setPhase('ooo') }]} />
      </PhraseChallenge>
    )
  }

  return (
    <PhraseChallenge
      key="ooo"
      stream={stream}
      prompt="Perfect. Now the round ones — say:"
      phrase="poodle groodle snoodle"
      judge={(clip) => judgeVowel(clip, 'ooo')}
    >
      <HumToContinue stream={stream} target={HUM_C} holdMs={500} onContinue={advance} />
    </PhraseChallenge>
  )
}
