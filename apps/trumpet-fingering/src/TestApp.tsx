/** Provides a component playground for the fingering app. */
import React, { useState } from "react";
import MusicStaff from "./MusicStaff";
import Fingering from "./Fingering";
import Keyboard from "./Keyboard";
import SelectFingering from "./SelectFingering";
import { Octave } from "./types";

const OCTAVES: Octave[] = [3, 4, 5, 6];

// Fingering display font size (fits "1+2+3" at size=200)
const FINGERING_FONT_SIZE = 48;

/**
 * Parse a keyboard note (like "C", "F#", "Bb") into letter and accidental
 */
function parseKeyboardNote(keyNote: string): {
  letter: string;
  accidental: string;
} {
  if (keyNote.length === 1) {
    return { letter: keyNote, accidental: "" };
  }
  // Handle sharps and flats
  const letter = keyNote[0];
  const suffix = keyNote.slice(1);
  if (suffix === "#") {
    return { letter, accidental: "#" };
  } else if (suffix === "b") {
    return { letter, accidental: "b" };
  }
  return { letter: keyNote, accidental: "" };
}

const TestApp: React.FC = () => {
  const [octave, setOctave] = useState<Octave>(5);
  const [keyboardNote, setKeyboardNote] = useState<string>("C");
  const [keyboardVersion] = useState(0);
  const [selectFingeringVersion] = useState(0);
  const [selectedFingering, setSelectedFingering] = useState<string | null>(
    null,
  );

  // Build the full note string from keyboard selection + octave
  const { letter, accidental } = parseKeyboardNote(keyboardNote);
  const noteString = `${letter}${accidental}${octave}`;

  const handleOctaveChange = (newOctave: Octave) => {
    setOctave(newOctave);
  };

  const handleNoteSelect = (note: string) => {
    setKeyboardNote(note);
  };

  const handleFingeringSelect = (fingering: string) => {
    setSelectedFingering(fingering);
    console.log("Selected fingering:", fingering);
  };

  return (
    <div style={styles.container}>
      {/* Music Staff Display */}
      <div style={styles.staffContainer}>
        <MusicStaff note={noteString} size={400} />
      </div>

      {/* Fingering Display */}
      <div style={styles.fingeringContainer}>
        <Fingering
          note={noteString}
          size={200}
          fontSize={FINGERING_FONT_SIZE}
        />
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <h2 style={styles.heading}>Select Note</h2>

        {/* Octave Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Octave</h3>
          <div style={styles.buttonRow}>
            {OCTAVES.map((oct) => (
              <button
                key={oct}
                onClick={() => handleOctaveChange(oct)}
                style={{
                  ...styles.button,
                  ...(octave === oct ? styles.buttonActive : {}),
                }}
              >
                {oct}
              </button>
            ))}
          </div>
        </div>

        {/* Piano Keyboard for Note Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Note</h3>
          <div style={styles.keyboardContainer}>
            <Keyboard
              width={320}
              height={160}
              version={keyboardVersion}
              onNoteSelect={handleNoteSelect}
            />
          </div>
        </div>

        {/* Current Note Display */}
        <div style={styles.currentNote}>
          {letter}
          {accidental === "#" && "♯"}
          {accidental === "b" && "♭"}
          {octave}
        </div>
      </div>

      {/* Select Fingering */}
      <div style={styles.selectFingeringContainer}>
        <SelectFingering
          width={300}
          height={450}
          advanced={false}
          version={selectFingeringVersion}
          onSelect={handleFingeringSelect}
        />
        {selectedFingering && (
          <div style={styles.selectedFingeringDisplay}>
            Selected: {selectedFingering}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "20px",
    gap: "40px",
    minHeight: "100vh",
    flexWrap: "wrap",
  },
  staffContainer: {
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  fingeringContainer: {
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  controlPanel: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    minWidth: "280px",
  },
  heading: {
    margin: "0 0 20px 0",
    fontSize: "24px",
    fontWeight: "600",
    color: "#333",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitle: {
    margin: "0 0 10px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  buttonRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  keyboardContainer: {
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  button: {
    padding: "12px 18px",
    fontSize: "18px",
    fontWeight: "500",
    border: "2px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#f8f8f8",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "44px",
  },
  buttonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
    color: "white",
  },
  currentNote: {
    marginTop: "24px",
    padding: "16px",
    fontSize: "32px",
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    color: "#333",
  },
  selectFingeringContainer: {
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  selectedFingeringDisplay: {
    padding: "12px",
    fontSize: "18px",
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "#f0f0f0",
    color: "#333",
  },
};

export default TestApp;
