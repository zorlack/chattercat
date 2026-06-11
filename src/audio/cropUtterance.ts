interface CropOptions {
  /** Padding kept before the detected speech, in ms (tight onset). */
  padStartMs?: number
  /** Padding kept after the detected speech, in ms (room for a release tail). */
  padEndMs?: number
}

interface Cropped {
  samples: Float32Array
  sampleRate: number
}

/**
 * Trims silence tightly around the spoken part of a decoded buffer. Works on the
 * first channel: measures an RMS envelope in short windows, derives a threshold
 * from the clip's own quietest window, and slices from the first to the last
 * window above it (plus a little padding).
 */
export function cropUtterance(
  buffer: AudioBuffer,
  { padStartMs = 10, padEndMs = 120 }: CropOptions = {},
): Cropped {
  const sampleRate = buffer.sampleRate
  const data = buffer.getChannelData(0)
  const n = data.length

  const win = Math.max(1, Math.floor(sampleRate * 0.02)) // 20ms window
  const hop = Math.max(1, Math.floor(sampleRate * 0.01)) // 10ms hop

  const positions: number[] = []
  const rms: number[] = []
  let quietest = Infinity

  for (let i = 0; i + win <= n; i += hop) {
    let sumSq = 0
    for (let k = i; k < i + win; k++) sumSq += data[k] * data[k]
    const r = Math.sqrt(sumSq / win)
    positions.push(i)
    rms.push(r)
    if (r < quietest) quietest = r
  }

  // Above the noise floor by a clear margin, but never below an absolute floor.
  const threshold = Math.max(quietest * 4, 0.01)

  let startSample = -1
  let endSample = -1
  for (let w = 0; w < rms.length; w++) {
    if (rms[w] >= threshold) {
      if (startSample < 0) startSample = positions[w]
      endSample = positions[w] + win
    }
  }

  if (startSample < 0) return { samples: new Float32Array(0), sampleRate }

  const padStart = Math.floor((sampleRate * padStartMs) / 1000)
  const padEnd = Math.floor((sampleRate * padEndMs) / 1000)
  const from = Math.max(0, startSample - padStart)
  const to = Math.min(n, endSample + padEnd)
  return { samples: data.slice(from, to), sampleRate }
}
