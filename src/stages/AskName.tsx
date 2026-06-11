import { useEffect, useRef, useState } from 'react'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { LevelMeter } from '../components/LevelMeter'
import { AudioPlayer } from '../components/AudioPlayer'
import { getMicStream } from '../audio/mic'
import { useUtteranceRecorder } from '../hooks/useUtteranceRecorder'
import { encodeWavMono } from '../audio/wav'
import { EFFECTS, declick } from '../audio/degrade'
import { setNameSample } from '../audio/nameSample'

// Stage 4: Chattercat asks your name, records + crops + band-limits it, then
// lets you mangle the clip with a kit of degradation effects and play back.
export function AskName({ advance, goTo }: StageProps) {
  const stream = getMicStream()
  const { phase, levelRef, clip, radio, error, reset } = useUtteranceRecorder({ stream })

  const [effectId, setEffectId] = useState('clean')
  const [url, setUrl] = useState<string | null>(null)
  // The exact samples currently playing — carried into the piano stage.
  const processedRef = useRef<Float32Array | null>(null)

  // Re-render the chosen effect to a fresh WAV whenever the clip or effect
  // changes, revoking the previous object URL.
  useEffect(() => {
    if (!clip) {
      setUrl(null)
      processedRef.current = null
      return
    }
    const effect = EFFECTS.find((e) => e.id === effectId) ?? EFFECTS[0]
    // Declick after the effect so quantizer steps at the edges don't pop.
    const processed = declick(effect.apply(clip.samples, clip.sampleRate), clip.sampleRate)
    processedRef.current = processed
    const objUrl = URL.createObjectURL(encodeWavMono(processed, clip.sampleRate))
    setUrl(objUrl)
    return () => URL.revokeObjectURL(objUrl)
  }, [clip, effectId])

  const reRecord = () => {
    setEffectId('clean')
    reset()
  }

  // Hand the chosen variant to the piano stage, then advance.
  const toPiano = () => {
    if (clip && processedRef.current) {
      setNameSample({ samples: processedRef.current, sampleRate: clip.sampleRate })
    }
    advance()
  }

  const line = !stream
    ? "I lost the mic — let's reconnect."
    : phase === 'done'
      ? "Nice to meet you! Here's how you sound — try mangling it."
      : phase === 'error'
        ? `${error ?? "I didn't catch that."} Want to try again?`
        : "What's your name? Say it out loud."

  return (
    <Codec speaker="Chattercat" avatar={phase === 'done' ? '😺' : '🐱'} line={line}>
      {!stream ? (
        <ReplyChoices choices={[{ label: '← Reconnect mic', onSelect: () => goTo('mic') }]} />
      ) : phase === 'done' && clip && url ? (
        <div className="listen">
          <AudioPlayer key={url} url={url} />

          <div className="effects">
            {EFFECTS.map((e) => (
              <button
                key={e.id}
                className={`effect ${e.id === effectId ? 'effect--on' : ''}`}
                onClick={() => setEffectId(e.id)}
              >
                {e.label}
              </button>
            ))}
          </div>

          <span className="listen__hint">
            Narrowband · {radio.lowCut}–{radio.highCut} Hz @ {(radio.sampleRate / 1000).toFixed(1)} kHz
          </span>

          <ReplyChoices
            choices={[
              { label: '↻ Say it again', onSelect: reRecord },
              { label: 'Continue →', onSelect: toPiano },
            ]}
          />
        </div>
      ) : phase === 'error' ? (
        <ReplyChoices choices={[{ label: '↻ Try again', onSelect: reRecord }]} />
      ) : phase === 'processing' ? (
        <span className="codec__waiting">Trimming that up…</span>
      ) : (
        <div className="listen">
          <LevelMeter levelRef={levelRef} />
          <span className="listen__hint">
            {phase === 'recording' ? 'Recording…' : 'Listening… say your name'}
          </span>
        </div>
      )}
    </Codec>
  )
}
