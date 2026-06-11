// The low "codec" blips heard when Chattercat speaks (MGS-style). Routes
// through the shared engine so the master volume applies. No audio assets.

import { getAudioContext, getMaster } from './engine'

let lastBoop = 0

// One short, low, filtered square blip. Throttled so fast typing doesn't buzz.
export function boop(): void {
  const ctx = getAudioContext()

  const realNow = performance.now()
  if (realNow - lastBoop < 55) return
  lastBoop = realNow

  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  filter.type = 'lowpass'
  filter.frequency.value = 900

  osc.type = 'square'
  osc.frequency.value = 120 + Math.random() * 25

  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(getMaster())

  osc.start(t)
  osc.stop(t + 0.08)
}
