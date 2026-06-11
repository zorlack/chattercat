import { getAudioContext, getMaster, unlockAudio } from './engine'

// A tiny one-voice sampler: plays the name clip pitched by playback rate, one
// pitch per key. Monophonic — a new note quickly fades out the previous one so
// dragging across keys plays like an instrument instead of piling up.

let nameBuffer: AudioBuffer | null = null
let current: { src: AudioBufferSourceNode; gain: GainNode } | null = null
// Global tuning offset (in semitones) applied to every note, so the keyboard
// snaps to real musical pitches regardless of the recording's natural pitch.
let tuning = 0

export function setTuning(semitones: number): void {
  tuning = semitones
}

export function loadPianoSample(samples: Float32Array, sampleRate: number): void {
  const ctx = getAudioContext()
  const b = ctx.createBuffer(1, samples.length, sampleRate)
  b.getChannelData(0).set(samples)
  nameBuffer = b
}

export function playPianoNote(semitones: number): void {
  if (!nameBuffer) return
  const ctx = unlockAudio()
  const t = ctx.currentTime

  // Fade out and stop whatever's playing.
  if (current) {
    const { src, gain } = current
    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.03)
    src.stop(t + 0.04)
    current = null
  }

  const src = ctx.createBufferSource()
  src.buffer = nameBuffer
  src.playbackRate.value = Math.pow(2, (semitones + tuning) / 12)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(1, t + 0.005)

  src.connect(gain)
  gain.connect(getMaster())
  src.start(t)

  const node = { src, gain }
  current = node
  src.onended = () => {
    if (current === node) current = null
  }
}
