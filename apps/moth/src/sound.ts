/** Quiet, locally synthesised generation tones; audio starts only after a user gesture. */
let context: AudioContext | null = null;
let output: GainNode | null = null;

/** Unlocks browser audio on a touch or key press, without playing a tone. */
export function unlockSound() {
  if (typeof AudioContext === "undefined") return;
  context ??= new AudioContext();
  if (!output) {
    output = context.createGain();
    output.connect(context.destination);
  }
  void context.resume().catch(() => {});
}

/** Silences ongoing tones as well as future generations. */
export function muteSound(muted: boolean) {
  if (context && output)
    output.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.005);
}

/** Maps mean wing shade to three octaves, with a soft attack and release. */
export function generationTone(shade: number, muted: boolean) {
  if (muted || !context || !output || context.state !== "running") return;
  muteSound(false);
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.frequency.value = 110 * 2 ** (shade * 3);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.045, now + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.023);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(now);
  oscillator.stop(now + 0.025);
  oscillator.onended = () => {
    oscillator.disconnect();
    envelope.disconnect();
  };
}
