import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAGES, pathForIndex } from '../game/stages'

/** Hidden dev tool: the backtick (`) key toggles a dropdown to jump to any stage. */
export function DevMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  const go = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="devmenu">
      <div className="devmenu__title">DEV · jump to stage</div>
      {STAGES.map((s, i) => (
        <button key={s.id} className="devmenu__item" onClick={() => go(pathForIndex(i))}>
          s{i + 1} · {s.title}
        </button>
      ))}
      <button className="devmenu__item" onClick={() => go('/done')}>
        done
      </button>
    </div>
  )
}
