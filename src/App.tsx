import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AudioGate } from './game/AudioGate'
import { StageHost } from './game/StageHost'
import { Complete } from './game/Complete'
import { VolumeControl } from './components/VolumeControl'
import { STAGES, pathForIndex } from './game/stages'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AudioGate>
        <VolumeControl />
        <Routes>
          <Route path="/" element={<Navigate to={pathForIndex(0)} replace />} />
          {STAGES.map((stage, i) => (
            <Route key={stage.id} path={pathForIndex(i)} element={<StageHost index={i} />} />
          ))}
          <Route path="/done" element={<Complete />} />
          <Route path="*" element={<Navigate to={pathForIndex(0)} replace />} />
        </Routes>
      </AudioGate>
    </BrowserRouter>
  )
}
