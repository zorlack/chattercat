// A small kit of destructive effects that run directly on mono Float32 PCM.
// Each is a pure (samples, sampleRate) -> samples function so they compose, and
// they're cheap enough to re-run live when the player switches effects.

/**
 * Quantize amplitude to a few steps — crunchy "quantized" sound. Quantizes
 * symmetrically around zero so silence stays silent (no DC offset).
 */
export function bitcrush(input: Float32Array, bits = 4): Float32Array {
  const steps = Math.pow(2, bits - 1)
  const out = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) {
    out[i] = Math.round(input[i] * steps) / steps
  }
  return out
}

/** Sample-and-hold downsampling by an integer factor — aliasing / lo-fi. */
export function decimate(input: Float32Array, factor = 4): Float32Array {
  const f = Math.max(1, Math.floor(factor))
  const out = new Float32Array(input.length)
  let hold = 0
  for (let i = 0; i < input.length; i++) {
    if (i % f === 0) hold = input[i]
    out[i] = hold
  }
  return out
}

/** Ring modulation against a sine carrier — metallic, robotic, FM-like. */
export function ringMod(input: Float32Array, sampleRate: number, freq = 180): Float32Array {
  const out = new Float32Array(input.length)
  const w = (2 * Math.PI * freq) / sampleRate
  for (let i = 0; i < input.length; i++) out[i] = input[i] * Math.sin(w * i)
  return out
}

/**
 * Short fade in/out on each end to kill onset/offset clicks. Run this *after*
 * an effect: quantizers like bitcrush create a hard step at the quiet onset,
 * and ramping the already-processed output smooths it away.
 */
export function declick(
  input: Float32Array,
  sampleRate: number,
  { fadeInMs = 18, fadeOutMs = 100 }: { fadeInMs?: number; fadeOutMs?: number } = {},
): Float32Array {
  const out = input.slice()
  const len = out.length
  const inN = Math.min(Math.floor((sampleRate * fadeInMs) / 1000), len)
  const outN = Math.min(Math.floor((sampleRate * fadeOutMs) / 1000), len)

  // Short raised-cosine attack to kill the onset click.
  for (let i = 0; i < inN; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / inN)
  // Long release ramp over the captured tail so it doesn't end abruptly.
  for (let i = 0; i < outN; i++) out[len - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / outN)

  return out
}

/** Peak-normalize so degraded clips stay at a comparable level. */
export function normalize(input: Float32Array, peak = 0.9): Float32Array {
  let max = 0
  for (let i = 0; i < input.length; i++) max = Math.max(max, Math.abs(input[i]))
  if (max === 0) return input
  const g = peak / max
  const out = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) out[i] = input[i] * g
  return out
}

export interface Effect {
  id: string
  label: string
  apply: (samples: Float32Array, sampleRate: number) => Float32Array
}

export const EFFECTS: Effect[] = [
  // Every effect peak-normalizes to the same target so switching doesn't jump
  // in loudness — including Clean, which would otherwise play quieter.
  { id: 'clean', label: 'Purrfine', apply: (s) => normalize(s) },
  { id: 'crush', label: 'Crunchmuffin', apply: (s) => normalize(bitcrush(normalize(s), 4)) },
  {
    id: 'eightbit',
    label: 'Bitkitten',
    apply: (s) => normalize(bitcrush(decimate(normalize(s), 3), 4)),
  },
  { id: 'ring', label: 'Wobbletron', apply: (s, sr) => normalize(ringMod(normalize(s), sr, 180)) },
]
