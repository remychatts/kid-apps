/** Synthesises trumpet notes with Tone.js for staff playback. */
import * as Tone from "tone";
import { Note, noteToMidi, midiToFrequency } from "./types";

let synth: Tone.Synth | null = null;

function getSynth(): Tone.Synth {
  if (!synth) {
    // Create a brass-like synth sound at reduced volume (30% of full)
    synth = new Tone.Synth({
      oscillator: {
        type: "sawtooth",
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3,
      },
      volume: -25,
    }).toDestination();
  }
  return synth;
}

export async function playTrumpetSound(
  note: Note,
  durationSeconds: number = 0.8,
  isCancelled?: () => boolean,
): Promise<void> {
  // Start audio context if not already started
  // This may block until user interaction (browser autoplay policy)
  await Tone.start();

  // Check if this sound was cancelled while waiting for audio context
  if (isCancelled?.()) {
    return;
  }

  const midi = noteToMidi(note);
  // Play two semitones lower (Bb trumpet transposition)
  const transposedMidi = midi - 2;
  const frequency = midiToFrequency(transposedMidi);

  const s = getSynth();
  s.triggerAttackRelease(frequency, durationSeconds);
}
