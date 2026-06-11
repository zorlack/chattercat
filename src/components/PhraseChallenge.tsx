import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Codec } from './Codec'
import { ReplyChoices } from './ReplyChoices'
import { LevelMeter } from './LevelMeter'
import { AudioPlayer } from './AudioPlayer'
import { useUtteranceRecorder, type Clip } from '../hooks/useUtteranceRecorder'
import { encodeWavMono } from '../audio/wav'

interface Props {
  stream: MediaStream
  /** Framing line the cat speaks. */
  prompt: string
  /** The phrase to say, shown bold in the dialog. */
  phrase: string
  /** Scores/comments the captured clip. */
  judge: (clip: Clip) => string
  /** Trailing silence (ms) that ends the utterance — longer for multi-word phrases. */
  silenceMs?: number
  /** Continuation shown after the verdict (e.g. a Next button or HumToContinue). */
  children?: ReactNode
}

/**
 * One round of: prompt + an emphasized phrase, record the player saying it,
 * judge it, play it back, and reveal a continuation. Remount (via key) to run
 * another round. Recording starts only after the prompt finishes typing.
 */
export function PhraseChallenge({ stream, prompt, phrase, judge, silenceMs = 1200, children }: Props) {
  const [armed, setArmed] = useState(false)
  const [verdict, setVerdict] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)

  const judgeRef = useRef(judge)
  judgeRef.current = judge

  const { phase, levelRef, clip, error, reset } = useUtteranceRecorder({
    stream,
    enabled: armed,
    silenceMs,
    maxMs: 8000,
  })

  // Judge once a clip is captured.
  useEffect(() => {
    if (phase === 'done' && clip && !verdict) setVerdict(judgeRef.current(clip))
  }, [phase, clip, verdict])

  // Playback URL for the captured clip.
  useEffect(() => {
    if (!clip) {
      setUrl(null)
      return
    }
    const objUrl = URL.createObjectURL(encodeWavMono(clip.samples, clip.sampleRate))
    setUrl(objUrl)
    return () => URL.revokeObjectURL(objUrl)
  }, [clip])

  const retry = () => {
    setVerdict(null)
    setArmed(false)
    reset()
  }

  const done = phase === 'done' && verdict !== null
  const line = done ? verdict! : phase === 'error' ? `${error ?? "Didn't catch that."} One more go?` : prompt
  const showPhrase = !done && phase !== 'error'

  return (
    <Codec
      speaker="Chattercat"
      avatar={done ? '😼' : '🐱'}
      line={line}
      phrase={showPhrase ? phrase : undefined}
      onLineComplete={() => setArmed(true)}
    >
      {phase === 'error' ? (
        <ReplyChoices choices={[{ label: '↻ Try again', onSelect: retry }]} />
      ) : done ? (
        <div className="listen">
          {url && <AudioPlayer url={url} label="▶ Hear it back" />}
          {children}
        </div>
      ) : phase === 'processing' ? (
        <span className="codec__waiting">Judging…</span>
      ) : (
        <div className="listen">
          <LevelMeter levelRef={levelRef} />
          <span className="listen__hint">{phase === 'recording' ? 'Recording…' : 'Listening…'}</span>
        </div>
      )}
    </Codec>
  )
}
