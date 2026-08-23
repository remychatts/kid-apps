/**
 * Produces tiny synthesised game sounds with the Web Audio API, avoiding network assets.
 */
type SoundName = "tap" | "reveal" | "turn" | "vote";

let audioContext: AudioContext | null = null;

/** Plays a short sound suitable for the given game event. */
export function playSound(name: SoundName, muted: boolean): void {
  if (muted) return;

  audioContext ??= new AudioContext();
  const context = audioContext;
  const now = context.currentTime;
  const notes: Record<SoundName, readonly number[]> = {
    tap: [420],
    reveal: [440, 660, 880],
    turn: [520, 700],
    vote: [392, 523, 659, 784],
  };

  notes[name].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + index * 0.075;
    oscillator.type = name === "vote" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.1, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  });
}
