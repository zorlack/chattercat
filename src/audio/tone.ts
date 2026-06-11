import { getMaster, unlockAudio } from './engine'

/** Play a pure reference tone at `freq` Hz for `ms`, through the master gain. */
export function playTone(freq: number, ms = 1000): void {
  const ctx = unlockAudio()
  const t = ctx.currentTime
  const dur = ms / 1000

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq

  // Quick fade in/out so the tone doesn't click.
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
  gain.gain.setValueAtTime(0.25, t + dur - 0.05)
  gain.gain.linearRampToValueAtTime(0, t + dur)

  osc.connect(gain)
  gain.connect(getMaster())
  osc.start(t)
  osc.stop(t + dur + 0.02)
}
