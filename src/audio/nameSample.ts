// Holds the processed name clip so the piano (and later stages) can play it
// without re-recording. Persisted to localStorage so the player can deep-link
// into stage 5+ across reloads without going back to record their name.

export interface NameSample {
  samples: Float32Array
  sampleRate: number
}

const KEY = 'chattercat.nameSample'

let sample: NameSample | null = null
let loaded = false

function serialize(s: NameSample): string {
  const bytes = new Uint8Array(s.samples.buffer, s.samples.byteOffset, s.samples.byteLength)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return JSON.stringify({ sampleRate: s.sampleRate, data: btoa(bin) })
}

function deserialize(raw: string): NameSample {
  const { sampleRate, data } = JSON.parse(raw) as { sampleRate: number; data: string }
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { samples: new Float32Array(bytes.buffer), sampleRate }
}

function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) sample = deserialize(raw)
  } catch {
    /* corrupt or unavailable storage — ignore */
  }
}

export function getNameSample(): NameSample | null {
  ensureLoaded()
  return sample
}

export function setNameSample(s: NameSample | null): void {
  loaded = true
  sample = s
  try {
    if (s) localStorage.setItem(KEY, serialize(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage full or unavailable — keep the in-memory copy anyway */
  }
}
