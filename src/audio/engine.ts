// Central audio hub: one shared AudioContext and a master gain that everything
// routes through, so a single control sets global volume. Web Audio starts
// suspended until a user gesture — call unlockAudio() from a click.

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let volume = 0.8
const listeners = new Set<(v: number) => void>()

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    ctx = new Ctor!()
    master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
  }
  return ctx
}

/** The master gain node — connect all Web Audio sources here. */
export function getMaster(): GainNode {
  getAudioContext()
  return master!
}

export function unlockAudio(): AudioContext {
  const c = getAudioContext()
  if (c.state === 'suspended') void c.resume()
  return c
}

export function getVolume(): number {
  return volume
}

export function setVolume(v: number): void {
  volume = clamp(v, 0, 1)
  if (master) master.gain.value = volume
  listeners.forEach((l) => l(volume))
}

/** Subscribe to volume changes (e.g. to sync an HTML audio element). */
export function subscribeVolume(fn: (v: number) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
