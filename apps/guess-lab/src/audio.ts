/** Synthesises the game's short response and background activity sounds. */

let context: AudioContext | null = null;

/** Gets an audio context after a user gesture and wakes it when needed. */
function getContext() {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Plays one softly shaped oscillator note. */
function note(
  audio: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Unlocks audio in browsers which require a direct tap. */
export function wakeAudio() {
  getContext();
}

/** Plays a distinct rising, falling, or celebration response. */
export function playResponse(kind: "too-low" | "too-high" | "correct") {
  const audio = getContext();
  const now = audio.currentTime;
  if (kind === "too-low") {
    note(audio, 260, now, 0.13, 0.07, "triangle");
    note(audio, 360, now + 0.1, 0.16, 0.065, "triangle");
  } else if (kind === "too-high") {
    note(audio, 430, now, 0.13, 0.065, "triangle");
    note(audio, 280, now + 0.1, 0.16, 0.07, "triangle");
  } else {
    [523, 659, 784, 1047].forEach((frequency, index) =>
      note(audio, frequency, now + index * 0.085, 0.3, 0.085, "sine"),
    );
  }
}

/** Adds a quiet, occasional tick while rapid automatic trials run. */
export function playAutoTick(frame: number) {
  if (frame % 7 !== 0) return;
  const audio = getContext();
  note(audio, 150 + (frame % 5) * 22, audio.currentTime, 0.055, 0.018, "sine");
}
