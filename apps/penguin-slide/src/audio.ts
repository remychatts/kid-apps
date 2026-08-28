/** Creates the tiny synthesised soundtrack and effects for Penguin Peak. */
let context: AudioContext | null = null;
let muted = false;

/** Returns an audio context after a player gesture has unlocked it. */
function getContext(): AudioContext | null {
  if (muted) return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Plays a short oscillator note with a soft fade. */
function note(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08,
  delay = 0,
): void {
  const audio = getContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Plays one named game sound. */
export function playSound(
  sound: "jump" | "bump" | "crash" | "splash" | "win",
): void {
  if (sound === "jump") {
    note(330, 0.12, "triangle");
    note(520, 0.18, "triangle", 0.07, 0.07);
  } else if (sound === "bump") {
    note(150, 0.22, "square", 0.06);
  } else if (sound === "crash") {
    note(110, 0.4, "sawtooth", 0.09);
    note(72, 0.5, "square", 0.06, 0.08);
  } else if (sound === "splash") {
    note(160, 0.12, "sine", 0.08);
    note(100, 0.34, "sine", 0.07, 0.08);
  } else {
    [392, 494, 587, 784].forEach((frequency, index) =>
      note(frequency, 0.28, "triangle", 0.07, index * 0.1),
    );
  }
}

/** Toggles all game audio and returns the new muted state. */
export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}
