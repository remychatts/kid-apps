/** Gesture-triggered musical rewards and local, offline-cached applause. */
let context: AudioContext | undefined;
let applause: HTMLAudioElement | undefined;
const tracks = [
  "mixkit-small-group-cheer-and-applause-518.mp3",
  "mixkit-classroom-spontaneous-applause-500.mp3",
  "mixkit-cartoon-monkey-applause-103.mp3",
];

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

/** Plays one applause recording copied from the practice app's requested asset pool. */
export function playApplause(): void {
  stopApplause();
  const track = tracks[Math.floor(Math.random() * tracks.length)];
  applause = new Audio(`${import.meta.env.BASE_URL}applause/${track}`);
  applause.volume = 0.5;
  void applause.play().catch(() => {
    /* Browsers may block sound; the celebration still works. */
  });
}

/** Stops the long reward when dismissed, muted or navigating away. */
export function stopApplause(): void {
  applause?.pause();
  applause = undefined;
}
