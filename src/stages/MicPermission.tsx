import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { setMicStream } from '../audio/mic'

type MicState = 'asking' | 'requesting' | 'granted' | 'denied'

const LINES: Record<MicState, string> = {
  asking: 'Click below and tell your browser it is okay for me to listen.',
  requesting: 'Listening for your browser to say yes...',
  granted: "I can hear you! We're connected. Ready when you are.",
  denied: "Hmm, I can't hear a thing. Check the mic permission and try again?",
}

// Stage 1: request the microphone, spoken by Chattercat. On success we keep the
// stream alive and hand it to later stages via the shared mic holder.
export function MicPermission({ advance }: StageProps) {
  const [state, setState] = useState<MicState>('asking')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  async function requestMic() {
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(stream)
      setState('granted')
    } catch {
      setState('denied')
    }
  }

  // If we were detoured here by a mic-requiring stage, return there; otherwise
  // just continue to the next stage in order.
  const proceed = () => {
    const next = params.get('next')
    if (next) navigate(next)
    else advance()
  }

  return (
    <Codec speaker="Chattercat" avatar={state === 'granted' ? '😺' : '🐱'} line={LINES[state]}>
      {state === 'granted' ? (
        <ReplyChoices choices={[{ label: 'Continue →', onSelect: proceed }]} />
      ) : (
        <ReplyChoices
          choices={[
            {
              label:
                state === 'requesting'
                  ? 'Requesting…'
                  : state === 'denied'
                    ? '🎙️ Try again'
                    : '🎙️ Enable microphone',
              onSelect: requestMic,
            },
          ]}
        />
      )}
    </Codec>
  )
}
