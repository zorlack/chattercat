import type { StageDef } from './types'
import { MeetChattercat } from '../stages/MeetChattercat'
import { MicPermission } from '../stages/MicPermission'
import { ListenForSound } from '../stages/ListenForSound'
import { AskName } from '../stages/AskName'
import { Piano } from '../stages/Piano'
import { ToneCalibration } from '../stages/ToneCalibration'
import { Onward } from '../stages/Onward'
import { VowelCheck } from '../stages/VowelCheck'

// The ordered list of stages. Each one is an experiment that builds a new
// browser capability while teaching the player how to interact.
export const STAGES: StageDef[] = [
  { id: 'meet', title: 'Meet Chattercat', Component: MeetChattercat },
  { id: 'mic', title: 'Open the Mic', Component: MicPermission },
  { id: 'sound', title: 'Make a Sound', Component: ListenForSound, requiresMic: true },
  { id: 'name', title: 'Say Your Name', Component: AskName, requiresMic: true },
  { id: 'piano', title: 'Name Piano', Component: Piano },
  { id: 'tune', title: 'Tone Calibration', Component: ToneCalibration, requiresMic: true },
  { id: 'onward', title: 'Hum to Continue', Component: Onward, requiresMic: true },
  { id: 'vowels', title: 'Vowel Check', Component: VowelCheck, requiresMic: true },
]

/** Route path for the stage at `index` — 1-indexed, so /s1 is the first stage. */
export function pathForIndex(index: number): string {
  return `/s${index + 1}`
}

/** Route path for a stage id, or '/' if unknown. */
export function pathForId(id: string): string {
  const i = STAGES.findIndex((s) => s.id === id)
  return i >= 0 ? pathForIndex(i) : '/'
}

export const MIC_STAGE_INDEX = STAGES.findIndex((s) => s.id === 'mic')
