/** Shared specimens, gene-copy controls and woodland scenery for four canvases. */
import { useId, type CSSProperties, type ReactNode } from "react";
import { Moth } from "./Moth";
import { appearance, type Individual } from "./model";
import { barkColour } from "./palette";

/** Maps inherited shade to the same muted palette used for the bark. */
export function shadeColour(shade: number): string {
  return `hsl(68 12% ${23 + shade * 56}%)`;
}

/** Renders a light population silhouette with stable markings and no revealing face. */
export function Silhouette({
  shade,
  seed = 0,
  label,
  className = "",
}: {
  shade: number;
  seed?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 150 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`silhouette ${className}`}
    >
      <g fill={shadeColour(shade)}>
        <path d="M73 32 Q52 36 15 65 Q0 76 8 82 Q15 89 24 85 Q32 92 41 86 Q52 94 61 85 L73 68Z" />
        <path d="M77 32 Q98 36 135 65 Q150 76 142 82 Q135 89 126 85 Q118 92 109 86 Q98 94 89 85 L77 68Z" />
        <ellipse cx="75" cy="60" rx="7" ry="30" />
        <circle cx="75" cy="31" r="9" />
      </g>
      <path
        d="M71 26 Q66 13 56 10 M79 26 Q84 13 94 10"
        fill="none"
        stroke={shadeColour(shade)}
        strokeWidth="2"
      />
      <g
        fill={shade > 0.5 ? "#515647" : "#a4aa90"}
        opacity={shade > 0.5 ? 0.48 : 0.13}
      >
        {Array.from({ length: 18 }, (_, i) => {
          const x = 23 + ((i * 17 + (seed % 13)) % 39);
          const y = 65 + ((i * 7) % 17);
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={1 + (i % 2)} ry="1" />
              <ellipse cx={150 - x} cy={y} rx={1 + (i % 2)} ry="1" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Supplies deterministic bark grain and lichen; CSS sets the underlying shade. */
export function Bark({ shade }: { shade: number }) {
  const pattern = useId().replace(/:/g, "");
  return (
    <svg
      className="bark-art"
      preserveAspectRatio="none"
      viewBox="0 0 900 440"
      aria-hidden="true"
      style={{ background: barkColour(shade) }}
    >
      <defs>
        <pattern
          id={pattern}
          width="95"
          height="160"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M10 -20 Q-10 50 15 100 T10 180 M27 -20 Q51 30 31 95 T32 190 M76 -10 Q60 65 78 100 T76 180 M87 -10 Q99 40 85 72"
            stroke="#202b21"
            opacity=".2"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M17 0 Q8 50 24 88 M42 84 Q32 126 44 160 M65 0 Q52 30 59 63"
            stroke="#e5e4cf"
            opacity=".17"
            strokeWidth="5"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="900" height="440" fill={`url(#${pattern})`} />
      <g fill="#e9ead9" opacity={shade > 0.5 ? 0.24 : 0.035}>
        {Array.from({ length: 32 }, (_, i) => (
          <ellipse
            key={i}
            cx={(i * 157 + 37) % 900}
            cy={(i * 79 + 50) % 440}
            rx={9 + (i % 15)}
            ry={5 + (i % 11)}
            transform={`rotate(${i * 37} ${(i * 157 + 37) % 900} ${(i * 79 + 50) % 440})`}
          />
        ))}
      </g>
      <g fill="none" stroke="#273022" opacity=".18" strokeWidth="3">
        <ellipse cx="280" cy="230" rx="16" ry="53" />
        <ellipse cx="280" cy="230" rx="7" ry="28" />
        <ellipse cx="710" cy="80" rx="14" ry="43" />
      </g>
    </svg>
  );
}

/** Exposes copy identity and parental origin independently of colour perception. */
export function Genes({
  genes,
  onChange,
  prefix = "Gene",
  origin = true,
  selected,
}: {
  genes: number[];
  onChange?: (index: number) => void;
  prefix?: string;
  origin?: boolean;
  selected?: number;
}) {
  return (
    <div className="genes">
      {genes.slice(0, 2).map((copy, i) => (
        <div className="gene-wrap" key={i}>
          {onChange ? (
            <button
              className={`gene ${copy ? "light" : "dark"} ${selected === i ? "transmitted" : ""}`}
              onClick={() => onChange(i)}
              aria-label={`${prefix}, ${i === 0 ? "Mum's" : "Dad's"} copy: ${copy ? "Light" : "Dark"}. Change version.`}
            >
              {copy ? "L" : "D"}
            </button>
          ) : (
            <span
              className={`gene ${copy ? "light" : "dark"}`}
              aria-label={`${prefix}, ${i === 0 ? "Mum's" : "Dad's"} copy: ${copy ? "Light" : "Dark"}`}
            >
              {copy ? "L" : "D"}
            </span>
          )}
          {origin && <small>{i === 0 ? "from Mum" : "from Dad"}</small>}
        </div>
      ))}
    </div>
  );
}

/** Shows a detailed individual in the binary model or a shade-faithful many-gene moth. */
export function Specimen({
  genes,
  moth,
  seed = 42,
  motion = true,
  label,
  hidden = false,
}: {
  genes?: number[];
  moth?: Individual;
  seed?: number;
  motion?: boolean;
  label?: string;
  hidden?: boolean;
}) {
  if (hidden)
    return (
      <div className="mystery" aria-label="Appearance hidden">
        ?
      </div>
    );
  if (moth && moth.genes.length > 2)
    return (
      <Silhouette
        shade={moth.shade}
        seed={moth.cosmetic}
        label={label ?? "Moth shade"}
        className="specimen"
      />
    );
  return (
    <Moth
      form={
        appearance(genes ?? moth!.genes, "single") ? "typica" : "carbonaria"
      }
      seed={moth?.cosmetic ?? seed}
      animated={motion}
      label={
        label ??
        (appearance(genes ?? moth!.genes, "single")
          ? "Light moth"
          : "Dark moth")
      }
    />
  );
}

/** Keeps slider semantics and visible endpoints consistent across scenes. */
export function Slider({
  label,
  value,
  onChange,
  left,
  right,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  left: string;
  right: string;
  step?: number;
}) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="endpoints">
        <small>{left}</small>
        <small>{right}</small>
      </span>
    </label>
  );
}

/** Renders an explanatory sentence anchored to the current experiment. */
export function Thought({ children }: { children: ReactNode }) {
  return (
    <div className="thought">
      <span aria-hidden="true">✦</span>
      <p>{children}</p>
    </div>
  );
}

/** Returns a CSS custom-property object without weakening component prop types. */
export function cssVars(
  values: Record<string, string | number>,
): CSSProperties {
  return values as CSSProperties;
}
