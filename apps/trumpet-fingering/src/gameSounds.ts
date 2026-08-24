/** Plays recorded and synthesised feedback sounds for the fingering game. */

// Audio file paths
const SOUND_FILES = {
  cheering: "sounds/cheering.mp3",
  fail: "sounds/fail.mp3",
  ok: "sounds/ok.mp3",
  reward: "sounds/reward.mp3",
  win: "sounds/win.mp3",
};

// Preload audio elements
const audioElements: Record<string, HTMLAudioElement> = {};

function getAudio(key: keyof typeof SOUND_FILES): HTMLAudioElement {
  if (!audioElements[key]) {
    audioElements[key] = new Audio(SOUND_FILES[key]);
  }
  return audioElements[key];
}

/**
 * Play a preloaded sound file
 */
export function playSound(sound: keyof typeof SOUND_FILES, volume = 0.5): void {
  const audio = getAudio(sound);
  audio.pause(); // Stop any current playback before restarting
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Ignore errors (e.g., user hasn't interacted yet)
  });
}

// ============================================================
// Synthesized sounds using Web Audio API
// ============================================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play a short ascending success sound
 */
export function playSuccessSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Play a short descending failure sound
 */
export function playFailureSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

/**
 * Play a cool "spaceship ramping up" sound for streak milestones
 */
export function playStreakSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Multiple oscillators for a richer sound
  const frequencies = [200, 400, 600];

  frequencies.forEach((baseFreq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = i === 0 ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 4, now + 0.8);

    gain.gain.setValueAtTime(0.15 / (i + 1), now);
    gain.gain.setValueAtTime(0.2 / (i + 1), now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  });

  // Also play the cheering sound file
  playSound("cheering", 0.4);
}

/**
 * Play a shorter celebration sound for high score beats
 */
export function playHighScoreSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Quick arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    const noteStart = now + i * 0.08;
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.15);
  });

  // Also play the reward sound file
  playSound("reward", 0.3);
}
