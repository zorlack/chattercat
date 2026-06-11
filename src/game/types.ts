import type { ComponentType } from 'react'

/** Controls handed to every stage so it can drive progression. */
export interface StageProps {
  /** Move to the next stage in the registry. */
  advance: () => void
  /** Jump to a specific stage by id. */
  goTo: (id: string) => void
}

export interface StageDef {
  id: string
  title: string
  Component: ComponentType<StageProps>
  /** When true, the player is routed through the mic stage first if it isn't live. */
  requiresMic?: boolean
}
