import { useEffect, useState } from 'react'
import { getVolume, setVolume, subscribeVolume } from '../audio/engine'

/** Global master-volume slider, fixed in the corner. */
export function VolumeControl() {
  const [vol, setVol] = useState(getVolume())

  useEffect(() => subscribeVolume(setVol), [])

  return (
    <div className="volume">
      <span className="volume__icon" aria-hidden>
        {vol === 0 ? '🔇' : '🔊'}
      </span>
      <input
        className="volume__slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={vol}
        aria-label="Volume"
        onChange={(e) => setVolume(parseFloat(e.target.value))}
      />
    </div>
  )
}
