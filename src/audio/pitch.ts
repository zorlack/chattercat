// Monophonic pitch detection by autocorrelation. Robust to a missing
// fundamental (our radio band starts at 300 Hz and removes the actual F0), so
// it finds the period from the harmonics instead.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Estimate the fundamental of one frame, constrained to the voice range
// (≈60–600 Hz). Returns Hz, or -1 if too quiet / no clear period.
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const n = buf.length
  let rms = 0
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / n) < 0.01) return -1

  const c = new Float32Array(n)
  for (let lag = 0; lag < n; lag++) {
    let s = 0
    for (let i = 0; i < n - lag; i++) s += buf[i] * buf[i + lag]
    c[lag] = s
  }

  // Skip the initial downslope from lag 0, then find the strongest peak within
  // the plausible pitch-period range.
  let d = 0
  while (d < n - 1 && c[d] > c[d + 1]) d++
  const minLag = Math.floor(sampleRate / 600)
  const maxLag = Math.min(n - 1, Math.ceil(sampleRate / 60))

  let maxVal = -1
  let maxPos = -1
  for (let i = Math.max(d, minLag); i <= maxLag; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i]
      maxPos = i
    }
  }
  if (maxPos <= 0) return -1

  // Parabolic interpolation for sub-sample period accuracy.
  let T0 = maxPos
  if (T0 > 0 && T0 < n - 1) {
    const x1 = c[T0 - 1]
    const x2 = c[T0]
    const x3 = c[T0 + 1]
    const a = (x1 + x3 - 2 * x2) / 2
    const b = (x3 - x1) / 2
    if (a) T0 = T0 - b / (2 * a)
  }
  return sampleRate / T0
}

/** Median fundamental over voiced frames of the clip, or null. */
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  const win = Math.min(1024, samples.length)
  if (win < 64) return null
  const hop = Math.floor(win / 2)

  const freqs: number[] = []
  for (let start = 0; start + win <= samples.length; start += hop) {
    const f = autoCorrelate(samples.subarray(start, start + win), sampleRate)
    if (f > 60 && f < 600) freqs.push(f)
  }
  if (!freqs.length) return null
  freqs.sort((a, b) => a - b)
  return freqs[Math.floor(freqs.length / 2)]
}

/**
 * The fractional semitone offset that moves `f0` onto the nearest equal-tempered
 * note. Lies in [-0.5, 0.5]; add it to every key to put the keyboard in tune.
 */
export function snapOffsetSemitones(f0: number): number {
  const midiFloat = 69 + 12 * Math.log2(f0 / 440)
  return Math.round(midiFloat) - midiFloat
}

/** Nearest note name (e.g. "C#3") for a frequency. */
export function noteNameFor(f0: number): string {
  const midi = Math.round(69 + 12 * Math.log2(f0 / 440))
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`
}
