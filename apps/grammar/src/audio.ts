/** Gesture-triggered feedback and a locally bundled cheering reward. */
let context: AudioContext | undefined;
let cheering: HTMLAudioElement | undefined;

/** Plays a short warm chime, with a smaller reward for supported answers. */
export function playChime(small = false): void {
  try {
    context ??= new AudioContext();
    void context.resume();
    const notes = small ? [660] : [523.25, 659.25, 783.99];
    notes.forEach((note, index) => {
      const start = context!.currentTime + index * 0.075;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(small ? 0.045 : 0.07, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.27);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  } catch {
    /* Visual feedback remains available if audio is unavailable. */
  }
}

/** Plays a clearly descending, gentle failure cue after an incorrect guess. */
export function playIncorrect(): void {
  try {
    context ??= new AudioContext();
    void context.resume();
    [523.25, 392, 261.63].forEach((note, index) => {
      const start = context!.currentTime + index * 0.13;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(note, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        note * 0.9,
        start + 0.2,
      );
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.23);
    });
  } catch {
    /* The clue and highlighted answer still explain the mistake. */
  }
}

/** Plays the cheering clip also used by other games in this repository. */
export function playCheering(): void {
  stopCheering();
  try {
    cheering = new Audio(`${import.meta.env.BASE_URL}cheering.mp3`);
    cheering.volume = 0.65;
    void cheering.play().catch(() => {
      /* Browsers may block sound; the visual celebration still works. */
    });
  } catch {
    /* Keep the celebration usable without audio support. */
  }
}

/** Stops the long reward when dismissed, muted or navigating away. */
export function stopCheering(): void {
  cheering?.pause();
  cheering = undefined;
}
