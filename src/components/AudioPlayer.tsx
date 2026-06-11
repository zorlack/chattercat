import { useEffect, useRef, useState } from 'react'
import { getVolume, subscribeVolume } from '../audio/engine'

/** A single play/stop button for a clip at `url`. */
export function AudioPlayer({ url, label = '▶ Play it back' }: { url: string; label?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = new Audio(url)
    audio.volume = getVolume()
    // The HTML element isn't on the Web Audio graph, so track master volume.
    const unsub = subscribeVolume((v) => {
      audio.volume = v
    })
    audio.onended = () => setPlaying(false)
    audioRef.current = audio
    return () => {
      unsub()
      audio.pause()
      audioRef.current = null
    }
  }, [url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  return (
    <button className="choice" onClick={toggle}>
      {playing ? '⏹ Stop' : label}
    </button>
  )
}
