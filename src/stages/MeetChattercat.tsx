import { useState } from 'react'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'

// A small branching conversation. Each node is one Chattercat line plus the
// canned replies that move you to another node — or 'advance' to the next stage.
interface DialogueNode {
  line: string
  choices: { label: string; next: string | 'advance' }[]
}

const DIALOGUE: Record<string, DialogueNode> = {
  start: {
    line: 'Hola Friendo! Want to play a game?',
    choices: [
      { label: "Sure, let's play!", next: 'yes' },
      { label: 'What kind of game?', next: 'what' },
      { label: 'Who are you?', next: 'who' },
    ],
  },
  what: {
    line: 'A game you play with your voice. No controller — just you and the noise you make.',
    choices: [
      { label: "Ooh, I'm in.", next: 'yes' },
      { label: 'And who are you again?', next: 'who' },
    ],
  },
  who: {
    line: "I'm Chattercat. I live in your speakers and I run on sound — yours, specifically.",
    choices: [
      { label: 'Neat. How do I play?', next: 'what' },
      { label: "Okay, let's go!", next: 'yes' },
    ],
  },
  yes: {
    line: 'Purrfect. First I need to borrow your ears... I mean, your microphone.',
    choices: [{ label: 'Lead the way →', next: 'advance' }],
  },
}

export function MeetChattercat({ advance }: StageProps) {
  const [nodeId, setNodeId] = useState('start')
  const node = DIALOGUE[nodeId]

  return (
    <Codec speaker="Chattercat" avatar="🐱" line={node.line}>
      <ReplyChoices
        choices={node.choices.map((c) => ({
          label: c.label,
          onSelect: () => (c.next === 'advance' ? advance() : setNodeId(c.next)),
        }))}
      />
    </Codec>
  )
}
