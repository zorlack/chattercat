import { useEffect, useRef, useState } from 'react'
import type { StageProps } from '../game/types'
import { Codec } from '../components/Codec'
import { ReplyChoices } from '../components/ReplyChoices'
import { getNameSample } from '../audio/nameSample'
import { loadPianoSample, playPianoNote, setTuning } from '../audio/piano'
import { detectPitch, snapOffsetSemitones, noteNameFor } from '../audio/pitch'

// Two octaves' worth of white keys: half an octave (3 white keys) below the
// center, the center octave (C4–E5), then half an octave above. Only the center
// is bound to the keyboard — extension keys are mouse/drag only.
const WHITE_SEMIS = [7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33]

const CENTER_START = 3 // index of C4 in WHITE_SEMIS
const CENTER_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
const BLACK_KEYS: Record<number, string> = { 13: '2', 15: '3', 18: '5', 20: '6', 22: '7', 25: '9', 27: '0' }

const WHITE = WHITE_SEMIS.map((semi, i) => ({
  semi,
  key: i >= CENTER_START && i < CENTER_START + CENTER_KEYS.length ? CENTER_KEYS[i - CENTER_START] : null,
}))

// A sharp sits between two white keys a whole step apart. `after` = its left
// white-key index, used to position it.
const BLACK = WHITE_SEMIS.flatMap((semi, i) => {
  if (i === WHITE_SEMIS.length - 1 || WHITE_SEMIS[i + 1] - semi !== 2) return []
  const black = semi + 1
  return [{ semi: black, after: i, key: BLACK_KEYS[black] ?? null }]
})

const WHITE_PCT = 100 / WHITE.length
const BLACK_W = 4.5 // black-key width, percent

const KEYMAP: Record<string, number> = {}
for (const k of [...WHITE, ...BLACK]) if (k.key) KEYMAP[k.key] = k.semi

// --- Song (white-key C major, in the keyboard's octave) ---
const C = 12
const D = 14
const E = 16
const F = 17
const G = 19

interface SongNote {
  semi: number | null
  beats: number
}
interface Song {
  label: string
  tempo: number // bpm
  notes: SongNote[]
}

const n = (semi: number | null, beats = 1): SongNote => ({ semi, beats })

const ODE_TO_JOY: Song = {
  label: 'Ode to Joy',
  tempo: 130,
  notes: [
    n(E), n(E), n(F), n(G), n(G), n(F), n(E), n(D), n(C), n(C), n(D), n(E), n(E, 1.5), n(D, 0.5), n(D, 2),
    n(E), n(E), n(F), n(G), n(G), n(F), n(E), n(D), n(C), n(C), n(D), n(E), n(D, 1.5), n(C, 0.5), n(C, 2),
  ],
}

// Stage 5: a playable sampler made from the recorded name. Click/drag the keys
// or use the keyboard (Q–P + number keys). The reply slot becomes the piano.
export function Piano({ advance, goTo }: StageProps) {
  const sample = getNameSample()
  const [active, setActive] = useState<Set<number>>(new Set())
  const [playing, setPlaying] = useState(false)
  const [root, setRoot] = useState<string | null>(null)
  const pressedRef = useRef(false)
  const lastRef = useRef<number | null>(null)
  const timeoutsRef = useRef<number[]>([])

  // Load the sample, then auto-tune: detect its pitch and snap the keyboard to
  // the nearest real note.
  useEffect(() => {
    if (!sample) return
    loadPianoSample(sample.samples, sample.sampleRate)
    const f0 = detectPitch(sample.samples, sample.sampleRate)
    if (f0) {
      setTuning(snapOffsetSemitones(f0))
      // Lowest key sits an octave above the detected/snapped pitch.
      setRoot(noteNameFor(f0 * 2))
    } else {
      setTuning(0)
      setRoot(null)
    }
  }, [sample])

  // Computer-keyboard control.
  useEffect(() => {
    if (!sample) return
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement) return
      const semi = KEYMAP[e.key.toLowerCase()]
      if (semi === undefined) return
      playPianoNote(semi)
      setActive((s) => new Set(s).add(semi))
    }
    const up = (e: KeyboardEvent) => {
      const semi = KEYMAP[e.key.toLowerCase()]
      if (semi === undefined) return
      setActive((s) => {
        const n = new Set(s)
        n.delete(semi)
        return n
      })
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [sample])

  // Stop any scheduled song playback on unmount.
  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout)
  }, [])

  const stopSong = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    setPlaying(false)
    setActive(new Set())
  }

  const playSong = (song: Song) => {
    stopSong()
    setPlaying(true)
    const beat = 60000 / song.tempo
    let t = 0
    for (const note of song.notes) {
      const at = t
      const dur = note.beats * beat
      if (note.semi != null) {
        const semi = note.semi
        timeoutsRef.current.push(
          window.setTimeout(() => {
            playPianoNote(semi)
            setActive(new Set([semi]))
          }, at),
        )
      }
      t += dur
    }
    timeoutsRef.current.push(
      window.setTimeout(() => {
        setPlaying(false)
        setActive(new Set())
      }, t + 80),
    )
  }

  // Releasing the pointer anywhere ends the drag.
  useEffect(() => {
    const up = () => {
      const prev = lastRef.current
      pressedRef.current = false
      lastRef.current = null
      if (prev != null) {
        setActive((s) => {
          const n = new Set(s)
          n.delete(prev)
          return n
        })
      }
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  if (!sample) {
    return (
      <Codec
        speaker="Chattercat"
        avatar="🐱"
        line="I need your voice to build the piano. Let's record your name first."
      >
        <ReplyChoices choices={[{ label: '← Go record', onSelect: () => goTo('name') }]} />
      </Codec>
    )
  }

  // Find the key under the pointer and play it if it changed.
  const hit = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const attr = el?.dataset.semi
    if (attr == null) return
    const semi = Number(attr)
    if (semi !== lastRef.current) {
      const prev = lastRef.current
      lastRef.current = semi
      setActive((s) => {
        const n = new Set(s)
        if (prev != null) n.delete(prev)
        n.add(semi)
        return n
      })
      playPianoNote(semi)
    }
  }

  return (
    <Codec
      speaker="Chattercat"
      avatar="😺"
      line="Ta-da! 🎹 A piano made of your name. Click and drag, or play Q–P (and the number keys)."
    >
      <div className="listen">
        {root && <span className="listen__hint">🎵 Auto-tuned · center C = {root}</span>}
        <div
          className="piano"
          onPointerDown={(e) => {
            pressedRef.current = true
            lastRef.current = null
            e.currentTarget.setPointerCapture(e.pointerId)
            hit(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            if (pressedRef.current) hit(e.clientX, e.clientY)
          }}
        >
          <div className="piano__whites">
            {WHITE.map((k) => (
              <div
                key={k.semi}
                data-semi={k.semi}
                className={`wkey ${active.has(k.semi) ? 'wkey--on' : ''}`}
              >
                {k.key && <span className="key__label">{k.key.toUpperCase()}</span>}
              </div>
            ))}
          </div>
          {BLACK.map((k) => (
            <div
              key={k.semi}
              data-semi={k.semi}
              className={`bkey ${active.has(k.semi) ? 'bkey--on' : ''}`}
              style={{ left: `calc(${(k.after + 1) * WHITE_PCT}% - ${BLACK_W / 2}%)`, width: `${BLACK_W}%` }}
            >
              {k.key && <span className="key__label">{k.key}</span>}
            </div>
          ))}
        </div>

        <div className="piano__actions">
          <button
            className={`effect ${playing ? 'effect--on' : ''}`}
            onClick={() => (playing ? stopSong() : playSong(ODE_TO_JOY))}
          >
            {playing ? '⏹ ' : '▶ '}
            {ODE_TO_JOY.label}
          </button>
          <button className="choice choice--inline" onClick={advance}>
            Oh joy…
          </button>
        </div>
      </div>
    </Codec>
  )
}
