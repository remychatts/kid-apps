/** Renders the selectable grid of trumpet valve combinations. */
import React, { useState, useEffect } from "react";
import { Fingering } from "./Fingering";

// Highlight color for selected fingering
const HIGHLIGHT_COLOR = "#7abaff";

// Map display strings to internal fingering format
const DISPLAY_TO_FINGERING: Record<string, string> = {
  o: "",
  "1": "1",
  "2": "2",
  "3": "3",
  "1+2": "12",
  "1+3": "13",
  "2+3": "23",
  "1+2+3": "123",
};

interface SelectFingeringProps {
  width?: number;
  height?: number;
  advanced?: boolean;
  version: number;
  frozen?: boolean;
  onSelect: (fingering: string) => void;
}

export const SelectFingering: React.FC<SelectFingeringProps> = ({
  width = 600,
  height = 900,
  advanced = false,
  version,
  frozen = false,
  onSelect,
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  // Clear selection when version changes
  useEffect(() => {
    setSelected(null);
  }, [version]);

  // Define the fingering options (display strings)
  const basicRows = [
    ["o", "2"],
    ["1", "1+3"],
    ["1+2", "2+3"],
  ];

  const advancedRow = ["2+3", "1+2+3"];

  const rows = advanced ? [...basicRows, advancedRow] : basicRows;

  const handleClick = (displayString: string) => {
    if (frozen) return;
    setSelected(displayString);
    onSelect(displayString);
  };

  // Calculate cell dimensions
  const cols = 2;
  const numRows = rows.length;
  const cellWidth = width / cols;
  const cellHeight = height / numRows;
  const fingeringSize = Math.min(cellWidth, cellHeight) * 0.85;

  return (
    <div
      style={{
        width,
        height,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${numRows}, 1fr)`,
        backgroundColor: "white",
      }}
    >
      {rows.flatMap((row, rowIndex) =>
        row.map((displayString, colIndex) => {
          const isSelected = selected === displayString;
          const fingeringString = DISPLAY_TO_FINGERING[displayString];

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleClick(displayString)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: frozen ? "default" : "pointer",
                backgroundColor: isSelected ? HIGHLIGHT_COLOR : "white",
                border: "1px solid #ddd",
                boxSizing: "border-box",
                transition: "background-color 0.1s ease",
                opacity: frozen ? 0.7 : 1,
              }}
            >
              <Fingering fingering={fingeringString} size={fingeringSize} />
            </div>
          );
        }),
      )}
    </div>
  );
};

export default SelectFingering;
