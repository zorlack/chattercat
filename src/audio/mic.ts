// Holds the microphone stream granted in the permission stage so later stages
// can analyse it without re-prompting. Module state is fine here — there's a
// single mic for the whole game.

let micStream: MediaStream | null = null

export function setMicStream(stream: MediaStream | null): void {
  micStream = stream
}

export function getMicStream(): MediaStream | null {
  return micStream
}

/** True only if we hold a stream with at least one live audio track. */
export function isMicLive(): boolean {
  return !!micStream && micStream.getAudioTracks().some((t) => t.readyState === 'live')
}
