/** Draws a treble-clef note and provides trumpet-note playback. */
import React, { useEffect, useRef, useMemo } from "react";
import { Note, NoteLetter } from "./types";
import { playTrumpetSound } from "./sounds";
import { parseNoteString, noteStringsEqual } from "./noteUtils";

// ============================================================
// TWEAKABLE CONSTANTS - Adjust these to fine-tune appearance
// ============================================================

// SVG canvas size (default 250x250)
const DEFAULT_SIZE = 250;

// Staff positioning
const STAFF_TOP_MARGIN = 80; // Distance from top to first staff line
const STAFF_LINE_SPACING = 20; // Distance between staff lines
const STAFF_LEFT_MARGIN = 20;
const STAFF_RIGHT_MARGIN = 20;
const STAFF_LINE_THICKNESS = 2;

// Treble clef positioning
const CLEF_X = 35; // X position of treble clef
const CLEF_Y = 140; // Y position (baseline) of treble clef
const CLEF_FONT_SIZE = 80; // Font size for treble clef

// Note positioning
const NOTE_X = 180; // X position of note center
const NOTEHEAD_FONT_SIZE = 65; // Font size for notehead

// Accidental positioning
const ACCIDENTAL_FONT_SIZE = 50; // Font size for sharp/flat
const ACCIDENTAL_X_OFFSET = -22; // Distance left of notehead
const ACCIDENTAL_Y_OFFSET = 1; // Fine-tune vertical alignment

// Stem dimensions
const STEM_LENGTH = 65;
const STEM_THICKNESS = 2;
const STEM_X_OFFSET_UP = 8.5; // X offset for upward stems (right of notehead)
const STEM_X_OFFSET_DOWN = -8.5; // X offset for downward stems (left of notehead)

// Ledger line dimensions
const LEDGER_LINE_LENGTH = 35;
const LEDGER_LINE_THICKNESS = 2;

// Sound settings
const DEFAULT_SOUND_DURATION = 0.8;

// ============================================================
// SMuFL Unicode code points
// ============================================================
const TREBLE_CLEF = "\uE050";
const NOTEHEAD_BLACK = "\uE0A4";
const FLAT = "\uE260";
const SHARP = "\uE262";

// ============================================================
// Note positioning logic
// ============================================================

// Staff positions: 0 = middle line (B4), positive = above, negative = below
// Each unit is half a staff space
const NOTE_POSITIONS: Record<NoteLetter, number> = {
  C: -6, // C4 is 3 spaces below middle line
  D: -5,
  E: -4,
  F: -3,
  G: -2,
  A: -1,
  B: 0, // B4 is on middle line
};

// Get the note's position in half-spaces relative to B4 (middle line = 0)
function getNotePosition(note: Note): number {
  let position = NOTE_POSITIONS[note.letter];
  // Adjust for octave (each octave is 7 half-spaces)
  position += (note.octave - 4) * 7;
  return position;
}

function getNoteYPosition(
  note: Note,
  staffTopMargin: number,
  lineSpacing: number,
): number {
  // B4 is on the middle line (line 3, index 2)
  const middleLineY = staffTopMargin + 2 * lineSpacing;
  const position = getNotePosition(note);
  // Convert position to Y coordinate
  // Each position unit is half a line spacing
  // Positive position = higher pitch = lower Y
  return middleLineY - (position * lineSpacing) / 2;
}

// Returns array of Y positions for ledger lines needed for this note
// Staff lines are at positions -4, -2, 0, +2, +4 (E4, G4, B4, D5, F5)
// Ledger lines below: -6, -8, -10, ... (C4, A3, F3, ...)
// Ledger lines above: +6, +8, +10, ... (A5, C6, ...)
function getLedgerLinePositions(note: Note): number[] {
  const position = getNotePosition(note);
  const ledgerLines: number[] = [];

  if (position < -4) {
    // Below the staff - need ledger lines at -6, -8, ... down to position (or position+1 if in space)
    const lowestLine = position % 2 === 0 ? position : position + 1;
    for (let p = -6; p >= lowestLine; p -= 2) {
      ledgerLines.push(p);
    }
  } else if (position > 4) {
    // Above the staff - need ledger lines at +6, +8, ... up to position (or position-1 if in space)
    const highestLine = position % 2 === 0 ? position : position - 1;
    for (let p = 6; p <= highestLine; p += 2) {
      ledgerLines.push(p);
    }
  }

  return ledgerLines;
}

function stemGoesUp(note: Note): boolean {
  // B4 and higher: stem goes down
  const position = getNotePosition(note);
  return position < 0; // Below B4 = stem up, B4 and above = stem down
}

// ============================================================
// Component
// ============================================================

interface MusicStaffProps {
  note: string;
  size?: number;
  soundDuration?: number;
}

export const MusicStaff: React.FC<MusicStaffProps> = ({
  note: noteString,
  size = DEFAULT_SIZE,
  soundDuration = DEFAULT_SOUND_DURATION,
}) => {
  const prevNoteRef = useRef<string | null>(null);

  // Parse the note string into a Note object
  const note = useMemo(() => parseNoteString(noteString), [noteString]);

  // Play sound when note changes
  useEffect(() => {
    if (!noteStringsEqual(noteString, prevNoteRef.current)) {
      // Track whether this effect is still current (note hasn't changed again)
      let cancelled = false;

      const playSound = async () => {
        // Pass a cancellation check to playTrumpetSound
        await playTrumpetSound(note, soundDuration, () => cancelled);
      };

      playSound();
      prevNoteRef.current = noteString;

      return () => {
        cancelled = true;
      };
    }
  }, [note, noteString, soundDuration]);

  // Scale factor based on size
  const scale = size / DEFAULT_SIZE;
  const staffTop = STAFF_TOP_MARGIN * scale;
  const lineSpacing = STAFF_LINE_SPACING * scale;
  const leftMargin = STAFF_LEFT_MARGIN * scale;
  const rightMargin = STAFF_RIGHT_MARGIN * scale;

  return (
    <svg width={size} height={size} style={{ backgroundColor: "white" }}>
      {/* Staff frame (outer rect provides top/bottom lines and left/right bar lines) */}
      <rect
        x={leftMargin}
        y={staffTop}
        width={size - leftMargin - rightMargin}
        height={4 * lineSpacing}
        fill="none"
        stroke="black"
        strokeWidth={STAFF_LINE_THICKNESS * scale}
      />

      {/* Middle staff lines (lines 2, 3, 4 of 5) */}
      {[1, 2, 3].map((i) => (
        <line
          key={i}
          x1={leftMargin}
          y1={staffTop + i * lineSpacing}
          x2={size - rightMargin}
          y2={staffTop + i * lineSpacing}
          stroke="black"
          strokeWidth={STAFF_LINE_THICKNESS * scale}
        />
      ))}

      {/* Treble clef */}
      <text
        x={CLEF_X * scale}
        y={CLEF_Y * scale}
        fontFamily="Bravura"
        fontSize={CLEF_FONT_SIZE * scale}
        fill="black"
      >
        {TREBLE_CLEF}
      </text>

      {/* Note rendering */}
      <NoteRenderer
        note={note}
        scale={scale}
        staffTop={staffTop}
        lineSpacing={lineSpacing}
      />
    </svg>
  );
};

interface NoteRendererProps {
  note: Note;
  scale: number;
  staffTop: number;
  lineSpacing: number;
}

const NoteRenderer: React.FC<NoteRendererProps> = ({
  note,
  scale,
  staffTop,
  lineSpacing,
}) => {
  const noteY = getNoteYPosition(note, staffTop, lineSpacing);
  const noteX = NOTE_X * scale;

  // Calculate ledger line Y positions
  // B4 (middle line) is at staffTop + 2 * lineSpacing, position 0
  const middleLineY = staffTop + 2 * lineSpacing;
  const ledgerLinePositions = getLedgerLinePositions(note);
  const ledgerLineYs = ledgerLinePositions.map(
    (pos) => middleLineY - (pos * lineSpacing) / 2,
  );

  return (
    <>
      {/* Ledger lines */}
      {ledgerLineYs.map((y, i) => (
        <line
          key={i}
          x1={noteX - (LEDGER_LINE_LENGTH * scale) / 2}
          y1={y}
          x2={noteX + (LEDGER_LINE_LENGTH * scale) / 2}
          y2={y}
          stroke="black"
          strokeWidth={LEDGER_LINE_THICKNESS * scale}
        />
      ))}

      {/* Accidental */}
      {note.accidental && (
        <text
          x={noteX + ACCIDENTAL_X_OFFSET * scale}
          y={noteY + ACCIDENTAL_Y_OFFSET * scale}
          fontFamily="Bravura"
          fontSize={ACCIDENTAL_FONT_SIZE * scale}
          fill="black"
          textAnchor="middle"
        >
          {note.accidental === "flat" ? FLAT : SHARP}
        </text>
      )}

      {/* Notehead */}
      <text
        x={noteX}
        y={noteY}
        fontFamily="Bravura"
        fontSize={NOTEHEAD_FONT_SIZE * scale}
        fill="black"
        textAnchor="middle"
      >
        {NOTEHEAD_BLACK}
      </text>

      {/* Stem */}
      {stemGoesUp(note) ? (
        <line
          x1={noteX + STEM_X_OFFSET_UP * scale}
          y1={noteY}
          x2={noteX + STEM_X_OFFSET_UP * scale}
          y2={noteY - STEM_LENGTH * scale}
          stroke="black"
          strokeWidth={STEM_THICKNESS * scale}
        />
      ) : (
        <line
          x1={noteX + STEM_X_OFFSET_DOWN * scale}
          y1={noteY}
          x2={noteX + STEM_X_OFFSET_DOWN * scale}
          y2={noteY + STEM_LENGTH * scale}
          stroke="black"
          strokeWidth={STEM_THICKNESS * scale}
        />
      )}
    </>
  );
};

export default MusicStaff;
