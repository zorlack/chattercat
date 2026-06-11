import type { Clip } from '../hooks/useUtteranceRecorder'

export type VowelKind = 'eee' | 'ooo'

const VERDICTS: Record<VowelKind, string[]> = {
  eee: [
    'Textbook weasel.',
    "A touch weevil-heavy, but I'll allow it.",
    "Your E's are immaculate.",
    'Slightly squeaky. Noted in your file.',
  ],
  ooo: [
    'Magnificent poodle.',
    'Groodle confirmed.',
    "Your O's are perfectly round.",
    'A bit snoodly — I respect it.',
  ],
}

// TODO: real vowel analysis (formant detection on the clip) — for now a
// playful stub that just hands back a verdict.
export function judgeVowel(_clip: Clip, kind: VowelKind): string {
  const list = VERDICTS[kind]
  return list[Math.floor(Math.random() * list.length)]
}
