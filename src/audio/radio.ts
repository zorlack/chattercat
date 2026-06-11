// Turns a recorded buffer into a narrow-bandwidth "radio" signal: bandpass to
// the comms band and resample down to a low rate in one offline render. The low
// sample rate is what really thins it out (Nyquist drops with it), and the
// browser anti-aliases the downsample for us.

export interface RadioFormat {
  /** Highpass cutoff — trims lows/rumble. */
  lowCut: number
  /** Lowpass cutoff — trims highs. Keep below the target Nyquist. */
  highCut: number
  /** Target sample rate. 8000 ≈ telephone/comms. */
  sampleRate: number
}

export async function toRadio(buffer: AudioBuffer, fmt: RadioFormat): Promise<AudioBuffer> {
  const duration = buffer.length / buffer.sampleRate
  const len = Math.max(1, Math.ceil(duration * fmt.sampleRate))

  // Rendering into a context at the target rate resamples the source buffer.
  const offline = new OfflineAudioContext(1, len, fmt.sampleRate)

  const mono = offline.createBuffer(1, buffer.length, buffer.sampleRate)
  mono.copyToChannel(buffer.getChannelData(0), 0)

  const src = offline.createBufferSource()
  src.buffer = mono

  const filter = (type: BiquadFilterType, freq: number) => {
    const f = offline.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    return f
  }
  // Cascade for a steeper band — a tighter, more radio-like passband.
  const hp1 = filter('highpass', fmt.lowCut)
  const hp2 = filter('highpass', fmt.lowCut)
  const lp1 = filter('lowpass', fmt.highCut)
  const lp2 = filter('lowpass', fmt.highCut)

  src.connect(hp1)
  hp1.connect(hp2)
  hp2.connect(lp1)
  lp1.connect(lp2)
  lp2.connect(offline.destination)
  src.start()

  return offline.startRendering()
}
