import { Navigate, useNavigate } from 'react-router-dom'
import { STAGES, MIC_STAGE_INDEX, pathForIndex, pathForId } from './stages'
import { isMicLive } from '../audio/mic'

/**
 * Renders the stage at `index`, enforcing the mic guard and providing
 * router-backed navigation. If the stage needs the mic but it isn't live,
 * detour through the mic stage and come back via ?next=.
 */
export function StageHost({ index }: { index: number }) {
  const navigate = useNavigate()
  const stage = STAGES[index]

  if (stage.requiresMic && !isMicLive()) {
    const dest = encodeURIComponent(pathForIndex(index))
    return <Navigate to={`${pathForIndex(MIC_STAGE_INDEX)}?next=${dest}`} replace />
  }

  const advance = () => {
    const next = index + 1
    navigate(next >= STAGES.length ? '/done' : pathForIndex(next))
  }
  const goTo = (id: string) => navigate(pathForId(id))

  const Stage = stage.Component
  return (
    <div className="game">
      <Stage advance={advance} goTo={goTo} />
    </div>
  )
}
