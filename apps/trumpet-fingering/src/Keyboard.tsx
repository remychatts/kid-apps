/** Renders the interactive piano keyboard used for note answers. */
import React, { useState, useEffect } from "react";

// Visual styling constants - easily tweakable
const STYLE = {
  // Key colors
  WHITE_KEY_BG: "#ffffff",
  BLACK_KEY_BG: "#1a1a1a",
  WHITE_KEY_HIGHLIGHT: "#7CB9FF",
  BLACK_KEY_HIGHLIGHT: "#4A90D9",

  // Border and outline
  KEY_BORDER_COLOR: "#333333",
  KEY_BORDER_WIDTH: 2,

  // Label styling
  WHITE_KEY_LABEL_COLOR: "#333333",
  BLACK_KEY_LABEL_COLOR: "#ffffff",
  LABEL_FONT_SIZE_RATIO: 0.08, // relative to height

  // Key dimensions (ratios)
  BLACK_KEY_WIDTH_RATIO: 0.6, // relative to white key width
  BLACK_KEY_HEIGHT_RATIO: 0.6, // relative to keyboard height

  // Z-indices
  WHITE_KEY_Z: 1,
  BLACK_KEY_Z: 2,
} as const;

// The white keys in order
const WHITE_KEYS = ["C", "D", "E", "F", "G", "A", "B"] as const;

// Black keys with their positions (between which white keys) and names
// Position is the index of the white key to the LEFT of the black key
const BLACK_KEYS: { note: string; position: number; label?: string }[] = [
  { note: "C#", position: 0 }, // between C and D
  { note: "D#", position: 1 }, // between D and E
  { note: "F#", position: 3, label: "F#" }, // between F and G, labeled
  { note: "G#", position: 4 }, // between G and A
  { note: "Bb", position: 5, label: "Bb" }, // between A and B, labeled
];

interface KeyboardProps {
  width?: number;
  height?: number;
  version: number;
  frozen?: boolean;
  onNoteSelect: (note: string) => void;
}

const Keyboard: React.FC<KeyboardProps> = ({
  width = 600,
  height = 300,
  version,
  frozen = false,
  onNoteSelect,
}) => {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  // Reset selection when version changes
  useEffect(() => {
    setSelectedNote(null);
  }, [version]);

  const handleKeyClick = (note: string) => {
    if (frozen) return;
    setSelectedNote(note);
    onNoteSelect(note);
  };

  // Calculate dimensions
  const whiteKeyWidth = width / WHITE_KEYS.length;
  const blackKeyWidth = whiteKeyWidth * STYLE.BLACK_KEY_WIDTH_RATIO;
  const blackKeyHeight = height * STYLE.BLACK_KEY_HEIGHT_RATIO;
  const labelFontSize = height * STYLE.LABEL_FONT_SIZE_RATIO;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: width,
    height: height,
    display: "flex",
    userSelect: "none",
  };

  const getWhiteKeyStyle = (isSelected: boolean): React.CSSProperties => ({
    position: "relative",
    width: whiteKeyWidth,
    height: height,
    backgroundColor: isSelected
      ? STYLE.WHITE_KEY_HIGHLIGHT
      : STYLE.WHITE_KEY_BG,
    border: `${STYLE.KEY_BORDER_WIDTH}px solid ${STYLE.KEY_BORDER_COLOR}`,
    borderRight: "none", // avoid double borders
    boxSizing: "border-box",
    cursor: frozen ? "default" : "pointer",
    // Note: white keys should NOT have z-index or opacity set, as these create
    // stacking contexts that interfere with the black keys' positioning
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: labelFontSize * 0.5,
    transition: "background-color 0.1s ease",
  });

  const getBlackKeyStyle = (
    position: number,
    isSelected: boolean,
  ): React.CSSProperties => ({
    position: "absolute",
    left: (position + 1) * whiteKeyWidth - blackKeyWidth / 2,
    top: 0,
    width: blackKeyWidth,
    height: blackKeyHeight,
    backgroundColor: isSelected
      ? STYLE.BLACK_KEY_HIGHLIGHT
      : STYLE.BLACK_KEY_BG,
    border: `${STYLE.KEY_BORDER_WIDTH}px solid ${STYLE.KEY_BORDER_COLOR}`,
    boxSizing: "border-box",
    cursor: frozen ? "default" : "pointer",
    zIndex: STYLE.BLACK_KEY_Z,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: labelFontSize * 0.3,
    borderRadius: "0 0 4px 4px",
    transition: "background-color 0.1s ease",
  });

  const whiteLabelStyle: React.CSSProperties = {
    fontSize: labelFontSize,
    fontWeight: 600,
    color: STYLE.WHITE_KEY_LABEL_COLOR,
    pointerEvents: "none",
  };

  const blackLabelStyle: React.CSSProperties = {
    fontSize: labelFontSize * 0.75,
    fontWeight: 600,
    color: STYLE.BLACK_KEY_LABEL_COLOR,
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle}>
      {/* White keys */}
      {WHITE_KEYS.map((note, index) => (
        <div
          key={note}
          style={{
            ...getWhiteKeyStyle(selectedNote === note),
            // Add right border only on last key
            ...(index === WHITE_KEYS.length - 1
              ? {
                  borderRight: `${STYLE.KEY_BORDER_WIDTH}px solid ${STYLE.KEY_BORDER_COLOR}`,
                }
              : {}),
          }}
          onClick={() => handleKeyClick(note)}
        >
          <span style={whiteLabelStyle}>{note}</span>
        </div>
      ))}

      {/* Black keys */}
      {BLACK_KEYS.map((key) => (
        <div
          key={key.note}
          style={getBlackKeyStyle(key.position, selectedNote === key.note)}
          onClick={() => handleKeyClick(key.note)}
        >
          {key.label && <span style={blackLabelStyle}>{key.label}</span>}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
