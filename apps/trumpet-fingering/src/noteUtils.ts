/** Parses, formats and compares the note values used throughout the game. */
import { Note, NoteLetter, Accidental, Octave } from "./types";

/**
 * Parse a note string like "C5", "Bb4", "F#5" into a Note object.
 *
 * Format: [Letter][Accidental][Octave]
 * - Letter: C, D, E, F, G, A, B (case insensitive)
 * - Accidental: # or ♯ (sharp), b or ♭ (flat), or nothing (natural)
 * - Octave: 3, 4, 5, or 6
 *
 * Examples:
 *   "C5"  -> { letter: 'C', octave: 5, accidental: null }
 *   "Bb4" -> { letter: 'B', octave: 4, accidental: 'flat' }
 *   "F#5" -> { letter: 'F', octave: 5, accidental: 'sharp' }
 */
export function parseNoteString(noteString: string): Note {
  if (!noteString || noteString.length < 2) {
    throw new Error(`Invalid note string: "${noteString}"`);
  }

  // Extract letter (first character)
  const letter = noteString[0].toUpperCase() as NoteLetter;
  if (!["C", "D", "E", "F", "G", "A", "B"].includes(letter)) {
    throw new Error(`Invalid note letter: "${noteString[0]}"`);
  }

  // Check for accidental and extract octave
  let accidental: Accidental = null;
  let octaveStr: string;

  const rest = noteString.slice(1);
  if (rest.startsWith("#") || rest.startsWith("♯")) {
    accidental = "sharp";
    octaveStr = rest.slice(1);
  } else if (rest.startsWith("b") || rest.startsWith("♭")) {
    accidental = "flat";
    octaveStr = rest.slice(1);
  } else {
    octaveStr = rest;
  }

  // Parse octave
  const octave = parseInt(octaveStr, 10) as Octave;
  if (![3, 4, 5, 6].includes(octave)) {
    throw new Error(`Invalid octave: "${octaveStr}" (must be 3, 4, 5, or 6)`);
  }

  return { letter, octave, accidental };
}

/**
 * Convert a Note object to a string like "C5", "Bb4", "F#5".
 */
export function noteToString(note: Note): string {
  let str = note.letter;
  if (note.accidental === "sharp") {
    str += "#";
  } else if (note.accidental === "flat") {
    str += "b";
  }
  str += note.octave;
  return str;
}

/**
 * Check if two note strings represent the same note.
 */
export function noteStringsEqual(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  if (a === b) return true;
  // Parse and compare to handle equivalent representations
  try {
    const noteA = parseNoteString(a);
    const noteB = parseNoteString(b);
    return (
      noteA.letter === noteB.letter &&
      noteA.octave === noteB.octave &&
      noteA.accidental === noteB.accidental
    );
  } catch {
    return false;
  }
}
