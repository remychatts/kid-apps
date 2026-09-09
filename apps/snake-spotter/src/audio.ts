/** Tiny Web Audio melodies for feedback without external sound files. */

export type SoundName = "tap" | "reveal" | "correct" | "wrong" | "finish";

const MELODIES: Record<SoundName, Array<[number, number, number]>> = {
  tap: [[520, 0, 0.08]],
  reveal: [
    [330, 0, 0.11],
    [440, 0.08, 0.13],
  ],
  correct: [
    [523, 0, 0.12],
    [659, 0.1, 0.12],
    [784, 0.2, 0.2],
  ],
  wrong: [
    [330, 0, 0.15],
    [247, 0.14, 0.24],
  ],
  finish: [
    [523, 0, 0.12],
    [659, 0.11, 0.12],
    [784, 0.22, 0.12],
    [1047, 0.34, 0.32],
  ],
};

/** Plays one short, friendly synthesised cue. */
export function playSound(name: SoundName, muted: boolean): void {
  if (muted) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const melody = MELODIES[name];
  melody.forEach(([frequency, delay, duration]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = name === "wrong" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  });
  window.setTimeout(() => void context.close(), 900);
}
