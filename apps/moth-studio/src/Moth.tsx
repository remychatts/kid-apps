/** Reusable, transparent SVG peppered moth. Form is explicit; seed controls cosmetics only. */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  makeMarkings,
  resolveFeatures,
  type Features,
  type MothForm,
} from "./specimen";
import "./moth.css";

export type MothProps = {
  form: MothForm;
  seed: number;
  features?: Partial<Features>;
  animated?: boolean;
  label?: string;
};

const wing =
  "M 9 8 C 44 13 101 41 147 73 C 173 91 195 110 198 123 Q 196 132 181 131 Q 174 138 164 134 Q 154 141 144 135 Q 132 141 123 135 Q 113 140 102 135 Q 91 141 81 136 Q 70 143 60 136 Q 46 145 38 134 C 25 120 17 60 9 8 Z";

/** Renders a friendly resting moth and pauses its CSS motion off-screen or in hidden tabs. */
export function Moth({
  form,
  seed,
  features,
  animated = true,
  label,
}: MothProps) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const anatomy = resolveFeatures(seed, features);
  // Keep very large eyes from covering one another at the narrowest spacing.
  const eyeOffset = Math.max(18 * anatomy.eyeSpacing, 17 * anatomy.eyeSize);
  const markings = useMemo(() => makeMarkings(seed), [seed]);
  const dark = form === "carbonaria";
  const outline = dark ? "#242c2c" : "#454d43";
  const fur = dark ? "#46504a" : "#ede9d7";

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (ref.current) observer.observe(ref.current);
    /** Stops hidden-page motion without accumulating JavaScript animation timers. */
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const style = {
    "--blink-time": `${5.2 + (seed % 13) * 0.19}s`,
    "--flap-time": `${9 + (seed % 11) * 0.39}s`,
    "--moth-delay": `${-(seed % 37) * 0.41}s`,
  } as CSSProperties;

  return (
    <svg
      ref={ref}
      className="moth"
      data-moving={animated && visible && pageVisible}
      viewBox="0 0 520 330"
      role="img"
      aria-label={
        label ??
        `${dark ? "Dark carbonaria" : "Light typica"} peppered moth with big eyes and a smile`
      }
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={`${id}-wing`}>
          <path d={wing} />
        </clipPath>
        <linearGradient id={`${id}-colour`} x1="0" y1="0" x2="0.7" y2="1">
          <stop stopColor={dark ? "#505650" : "#faf7e8"} />
          <stop offset="1" stopColor={dark ? "#282e30" : "#d8dbca"} />
        </linearGradient>
        <radialGradient id={`${id}-eye`} cx="0.35" cy="0.28" r="0.8">
          <stop stopColor="#dbb66d" />
          <stop offset="1" stopColor="#a56d39" />
        </radialGradient>
      </defs>
      <g transform="translate(260 125)">
        {/* Six small legs sit behind the resting wings and fluffy thorax. */}
        <g fill="none" stroke={outline} strokeWidth="3" strokeLinecap="round">
          {[-1, 1].map((side) => (
            <g key={side} transform={`scale(${side} 1)`}>
              <path d="M 13 20 Q 28 26 37 18 L 48 20 M 15 50 L 34 78 L 43 77 M 14 82 L 29 136 L 41 143" />
            </g>
          ))}
        </g>
        <path
          d="M -18 36 Q -24 108 -10 140 Q 0 161 10 140 Q 24 108 18 36"
          fill={fur}
          stroke={outline}
          strokeWidth="3"
        />
        <g stroke={outline} strokeWidth="3" fill="none" opacity="0.5">
          <path d="M -19 80 Q 0 88 19 80 M -17 99 Q 0 107 17 99 M -13 118 Q 0 125 13 118 M -8 135 Q 0 140 8 135" />
        </g>
        {[-1, 1].map((side) => (
          <g
            key={side}
            transform={`scale(${side * anatomy.wingSpan} ${anatomy.wingDepth})`}
          >
            <g className="moth-wing">
              <path
                d={wing}
                fill={`url(#${id}-colour)`}
                stroke={outline}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <g clipPath={`url(#${id}-wing)`}>
                <g
                  fill="none"
                  stroke={dark ? "#70786a" : "#89907a"}
                  strokeWidth="1.1"
                  opacity={dark ? "0.15" : "0.35"}
                >
                  <path d="M 18 19 Q 93 71 187 125 M 17 18 Q 80 93 144 137 M 17 18 Q 54 96 102 139 M 17 18 Q 36 97 60 139" />
                </g>
                <g
                  fill={dark ? "#929587" : "#414a41"}
                  opacity={dark ? "0.13" : "0.8"}
                >
                  {markings.map((path, index) => (
                    <path key={index} d={path} />
                  ))}
                </g>
                <g
                  fill="none"
                  stroke={dark ? "#171f22" : "#596252"}
                  strokeWidth="3.2"
                  opacity={dark ? "0.38" : "0.54"}
                  strokeLinecap="round"
                  strokeDasharray="3 4 7 3 2 6"
                >
                  <path d="M 46 17 Q 43 37 59 43 T 72 62 T 89 83 T 92 109 T 106 151 M 86 31 Q 80 47 98 57 T 113 79 T 132 94 T 141 114 T 157 148 M 172 85 Q 151 101 161 110 T 178 146" />
                </g>
                <path
                  d="M 35 133 Q 103 150 203 127"
                  fill="none"
                  stroke={dark ? "#818779" : "#fffdf0"}
                  strokeWidth="7"
                  strokeDasharray="1 3"
                  opacity="0.65"
                />
              </g>
            </g>
          </g>
        ))}
        <path
          d="M -22 3 Q -32 9 -25 21 L -30 30 L -23 32 L -25 44 L -16 41 L -13 51 L -5 46 L 0 54 L 7 46 L 16 51 L 18 40 L 27 43 L 24 31 L 31 27 L 24 18 Q 30 8 22 3 Z"
          fill={fur}
          stroke={outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <g transform={`translate(0 -23) scale(1 ${anatomy.antennaLength})`}>
          <g
            className="moth-antennae"
            fill="none"
            stroke={outline}
            strokeLinecap="round"
          >
            <path
              d="M -15 0 Q -25 -38 -52 -52 M 15 0 Q 25 -38 52 -52"
              strokeWidth="3.5"
            />
            <path
              d="M -29 -27 L -40 -29 M -34 -34 L -46 -36 M -39 -40 L -51 -43 M 29 -27 L 40 -29 M 34 -34 L 46 -36 M 39 -40 L 51 -43"
              strokeWidth="2"
            />
          </g>
        </g>
        <path
          d="M -32 -13 Q -29 -39 -14 -36 L -8 -40 L -2 -36 L 5 -40 L 11 -35 Q 31 -39 35 -12 Q 42 19 18 30 Q 0 38 -20 28 Q -41 18 -32 -13 Z"
          fill={fur}
          stroke={outline}
          strokeWidth="2.8"
        />
        {[-1, 1].map((side) => (
          <g
            key={side}
            transform={`translate(${side * eyeOffset} -5) scale(${anatomy.eyeSize})`}
          >
            <g className="moth-eye">
              <ellipse
                rx="17"
                ry="21"
                fill="#fffdf2"
                stroke={outline}
                strokeWidth="2"
              />
              <ellipse
                cx={side * -1}
                cy="1"
                rx="12.8"
                ry="16.4"
                fill={`url(#${id}-eye)`}
              />
              <ellipse
                cx={side * -1}
                cy="1.8"
                rx="9"
                ry="12.7"
                fill="#202b2b"
              />
              <ellipse cx="-4.5" cy="-6" rx="4.8" ry="6" fill="white" />
              <circle cx="5" cy="7" r="2.4" fill="#fff9dd" />
            </g>
          </g>
        ))}
        <ellipse
          cx="-26"
          cy="18"
          rx="6"
          ry="3.3"
          fill={dark ? "#bd9382" : "#e4ad93"}
          opacity="0.75"
        />
        <ellipse
          cx="26"
          cy="18"
          rx="6"
          ry="3.3"
          fill={dark ? "#bd9382" : "#e4ad93"}
          opacity="0.75"
        />
        <path
          d="M -9 18 Q 0 23 9 18 Q 6 31 0 29 Q -6 29 -9 18 Z"
          fill="#302c2b"
          stroke={outline}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M -5 26 Q 0 22 5 26 Q 0 31 -5 26" fill="#eb9b91" />
      </g>
    </svg>
  );
}
