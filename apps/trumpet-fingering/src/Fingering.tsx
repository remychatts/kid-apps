/** Renders the valve positions for a given trumpet note. */
import React, { useMemo } from "react";
import { getFingering, fingeringToDisplayText } from "./fingeringUtils";

// ============================================================
// TWEAKABLE CONSTANTS - Adjust these to fine-tune appearance
// ============================================================

// SVG canvas size
const DEFAULT_SIZE = 200;

// Text positioning (top half)
const TEXT_Y = 55; // Y position for fingering text baseline
const TEXT_FONT_SIZE = 48; // Base font size for fingering text

// Valve graphics positioning (bottom half)
const VALVE_SECTION_TOP = 100; // Y position where valve graphics start

// Valve dimensions
const VALVE_SPACING = 50; // Distance between valve centers
const VALVE_CASING_OFFSET = 25;
const VALVE_CENTER_X = 100; // X center of the middle valve
const VALVE_CASING_WIDTH = 30; // Width of valve casing
const VALVE_CASING_HEIGHT = 30; // Height of valve casing
const VALVE_CAP_WIDTH = 36; // Width of finger cap
const VALVE_CAP_HEIGHT = 20; // Height of finger cap
const VALVE_CAP_RADIUS = 4; // Corner radius of finger cap
const VALVE_PRESSED_OFFSET = 30; // How far down a pressed valve moves

// Stroke styling
const STROKE_WIDTH = 2;
const STROKE_COLOR = "#333";
const FILL_COLOR = "white";

// ============================================================
// Component
// ============================================================

interface FingeringProps {
  note?: string;
  fingering?: string; // Direct fingering string (e.g., "12" for 1+2), overrides note lookup
  size?: number;
  fontSize?: number; // Font size for fingering text (at default size=200)
}

export const Fingering: React.FC<FingeringProps> = ({
  note: noteString,
  fingering: fingeringProp,
  size = DEFAULT_SIZE,
  fontSize = TEXT_FONT_SIZE,
}) => {
  const scale = size / DEFAULT_SIZE;

  const fingering = useMemo(() => {
    if (fingeringProp !== undefined) return fingeringProp;
    if (noteString) return getFingering(noteString);
    return "";
  }, [noteString, fingeringProp]);
  const displayText = useMemo(
    () => fingeringToDisplayText(fingering),
    [fingering],
  );

  // Check which valves are pressed
  const valve1Pressed = fingering.includes("1");
  const valve2Pressed = fingering.includes("2");
  const valve3Pressed = fingering.includes("3");

  // Fixed font size (scaled proportionally with component size)
  const scaledFontSize = fontSize * scale;

  return (
    <svg width={size} height={size}>
      {/* Fingering text (top half) */}
      <text
        x={size / 2}
        y={TEXT_Y * scale}
        fontSize={scaledFontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fill={STROKE_COLOR}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {displayText}
      </text>

      {/* Valve graphics (bottom half) */}
      <g transform={`translate(0, ${VALVE_SECTION_TOP * scale})`}>
        <ValveGraphic valveNumber={1} pressed={valve1Pressed} scale={scale} />
        <ValveGraphic valveNumber={2} pressed={valve2Pressed} scale={scale} />
        <ValveGraphic valveNumber={3} pressed={valve3Pressed} scale={scale} />
      </g>
    </svg>
  );
};

// ============================================================
// Valve graphic sub-component
// ============================================================

interface ValveGraphicProps {
  valveNumber: 1 | 2 | 3;
  pressed: boolean;
  scale: number;
}

const ValveGraphic: React.FC<ValveGraphicProps> = ({
  valveNumber,
  pressed,
  scale,
}) => {
  // Calculate X position based on valve number (1 = left, 2 = center, 3 = right)
  const offsetX = (valveNumber - 2) * VALVE_SPACING * scale;
  const centerX = VALVE_CENTER_X * scale + offsetX;

  // Casing dimensions
  const casingWidth = VALVE_CASING_WIDTH * scale;
  const casingHeight = VALVE_CASING_HEIGHT * scale;
  const casingX = centerX - casingWidth / 2;
  const casingY = VALVE_CASING_OFFSET + VALVE_CAP_HEIGHT * scale + 5 * scale; // Leave room for cap at top

  // Cap dimensions and position
  const capWidth = VALVE_CAP_WIDTH * scale;
  const capHeight = VALVE_CAP_HEIGHT * scale;
  const capX = centerX - capWidth / 2;
  const capRadius = VALVE_CAP_RADIUS * scale;

  // Cap Y position (moves down when pressed)
  const capYUp = 0;
  const capYDown = VALVE_PRESSED_OFFSET * scale;
  const capY = pressed ? capYDown : capYUp;

  // Piston (connects cap to valve body)
  const pistonWidth = casingWidth * 0.4;
  const pistonX = centerX - pistonWidth / 2;
  const pistonTop = capY + capHeight;
  const pistonBottom = casingY;

  const strokeWidth = STROKE_WIDTH * scale;

  return (
    <g>
      {/* Valve casing (outer shell) */}
      <rect
        x={casingX}
        y={casingY}
        width={casingWidth}
        height={casingHeight}
        fill={FILL_COLOR}
        stroke={STROKE_COLOR}
        strokeWidth={strokeWidth}
        rx={2 * scale}
        ry={2 * scale}
      />

      {/* Piston rod */}
      <rect
        x={pistonX}
        y={pistonTop}
        width={pistonWidth}
        height={pistonBottom - pistonTop}
        fill={FILL_COLOR}
        stroke={STROKE_COLOR}
        strokeWidth={strokeWidth}
      />

      {/* Finger cap (top piece that moves) */}
      <rect
        x={capX}
        y={capY}
        width={capWidth}
        height={capHeight}
        fill={FILL_COLOR}
        stroke={STROKE_COLOR}
        strokeWidth={strokeWidth}
        rx={capRadius}
        ry={capRadius}
      />
    </g>
  );
};

export default Fingering;
