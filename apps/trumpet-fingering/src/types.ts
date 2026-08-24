/** Defines shared musical note types and conversion helpers. */
export type NoteLetter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Accidental = "sharp" | "flat" | null;
export type Octave = 3 | 4 | 5 | 6;

export interface Note {
  letter: NoteLetter;
  octave: Octave;
  accidental: Accidental;
}

// MIDI note numbers (C4 = 60)
export const NOTE_TO_MIDI: Record<NoteLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function noteToMidi(note: Note): number {
  const base = 60 + (note.octave - 4) * 12 + NOTE_TO_MIDI[note.letter];
  if (note.accidental === "sharp") return base + 1;
  if (note.accidental === "flat") return base - 1;
  return base;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
