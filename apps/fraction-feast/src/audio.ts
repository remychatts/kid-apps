/** Creates short, cheerful Web Audio cues without network-loaded sound files. */

let sharedContext: AudioContext | null = null;

/** Reuses one audio context so rapid slider changes do not exhaust iPad audio resources. */
function audioContext() {
  sharedContext ??= new window.AudioContext();
  return sharedContext;
}

/** Plays one synthesised feedback sound after a user gesture. */
export function playSound(
  kind: "tap" | "correct" | "complete" | "try-again",
  muted: boolean,
) {
  if (muted) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = audioContext();
  if (context.state === "suspended")
    void context.resume().catch(() => undefined);
  const notes = {
    tap: [440],
    correct: [523, 659],
    complete: [523, 659, 784, 1047],
    "try-again": [294, 247],
  }[kind];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.085;
    oscillator.type = kind === "tap" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.17);
  });
}
