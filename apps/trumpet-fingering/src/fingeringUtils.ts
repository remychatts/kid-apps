/** Converts trumpet note names and valve combinations into display values. */
import { parseNoteString } from "./noteUtils";

// ============================================================
// Fingering lookup table (F#3 to C6)
// Empty string = open, "1" = first valve, "12" = 1+2, etc.
// ============================================================

const FINGERINGS: Record<string, string> = {
  // Octave 3 (low register)
  "F#3": "123",
  Gb3: "123",
  G3: "13",
  "G#3": "23",
  Ab3: "23",
  A3: "12",
  "A#3": "1",
  Bb3: "1",
  B3: "2",

  // Octave 4
  C4: "",
  "C#4": "123",
  Db4: "123",
  D4: "13",
  "D#4": "23",
  Eb4: "23",
  E4: "12",
  F4: "1",
  "F#4": "2",
  Gb4: "2",
  G4: "",
  "G#4": "23",
  Ab4: "23",
  A4: "12",
  "A#4": "1",
  Bb4: "1",
  B4: "2",

  // Octave 5
  C5: "",
  "C#5": "12",
  Db5: "12",
  D5: "1",
  "D#5": "2",
  Eb5: "2",
  E5: "",
  F5: "1",
  "F#5": "2",
  Gb5: "2",
  G5: "",
  "G#5": "23",
  Ab5: "23",
  A5: "12",
  "A#5": "1",
  Bb5: "1",
  B5: "2",

  // Octave 6 (high C)
  C6: "",
};

/**
 * Get fingering string for a note.
 * Returns empty string for open, "1" for first valve, "12" for 1+2, etc.
 */
export function getFingering(noteString: string): string {
  const note = parseNoteString(noteString);

  // Build lookup key
  let key: string;
  if (note.accidental === "sharp") {
    key = `${note.letter}#${note.octave}`;
  } else if (note.accidental === "flat") {
    key = `${note.letter}b${note.octave}`;
  } else {
    key = `${note.letter}${note.octave}`;
  }

  if (key in FINGERINGS) {
    return FINGERINGS[key];
  }

  // Default to open if not found
  return "";
}

/**
 * Convert fingering string to display text.
 * "" -> "o", "1" -> "1", "12" -> "1+2", etc.
 */
export function fingeringToDisplayText(fingering: string): string {
  if (fingering === "") return "o";
  return fingering.split("").join("+");
}

/**
 * Convert display text back to fingering string.
 * "o" -> "", "1+2" -> "12", etc.
 */
export function displayTextToFingering(displayText: string): string {
  if (displayText === "o") return "";
  return displayText.replace(/\+/g, "");
}

/**
 * Get the note name (without octave) from a full note string.
 * "Bb4" -> "Bb", "F#5" -> "F#", "C4" -> "C"
 */
export function getNoteNameFromString(noteString: string): string {
  const note = parseNoteString(noteString);
  if (note.accidental === "sharp") {
    return `${note.letter}#`;
  } else if (note.accidental === "flat") {
    return `${note.letter}b`;
  }
  return note.letter;
}
