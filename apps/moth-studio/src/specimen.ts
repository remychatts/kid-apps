/** Seeded cosmetic anatomy and markings, deliberately independent of moth form. */
export type MothForm = "typica" | "carbonaria";
export const featureRanges = {
  eyeSize: { label: "Eye size", min: 0.8, max: 1.22 },
  eyeSpacing: { label: "Eye spacing", min: 0.85, max: 1.15 },
  wingSpan: { label: "Wing span", min: 0.85, max: 1.12 },
  wingDepth: { label: "Wing depth", min: 0.85, max: 1.15 },
  antennaLength: { label: "Antenna length", min: 0.7, max: 1.25 },
  bodyLength: { label: "Body length", min: 0.8, max: 1.25 },
} as const;
export type Features = Record<keyof typeof featureRanges, number>;
export type Specimen = { seed: number; form: MothForm; features: Features };

/** Returns a repeatable unsigned 32-bit pseudorandom stream, including seed zero. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keeps externally supplied cosmetic controls inside the drawable anatomy range. */
export function resolveFeatures(
  seed: number,
  overrides: Partial<Features> = {},
): Features {
  const random = seededRandom(seed);
  return Object.fromEntries(
    Object.entries(featureRanges).map(([key, range]) => {
      const generated = range.min + random() * (range.max - range.min);
      const value = overrides[key as keyof Features] ?? generated;
      return [
        key,
        Number.isFinite(value)
          ? Math.max(range.min, Math.min(range.max, value))
          : generated,
      ];
    }),
  ) as Features;
}

/** Creates one specimen without deriving its scientifically significant form from its seed. */
export function createSpecimen(seed: number, form: MothForm): Specimen {
  return { seed, form, features: resolveFeatures(seed) };
}

/** Builds irregular little ink islands; both wings share the same mirrored pattern. */
export function makeMarkings(seed: number): string[] {
  const random = seededRandom(seed ^ 0x51f15e);
  return Array.from({ length: 245 }, () => {
    const x = 12 + random() * 194;
    const y = 6 + random() * 145;
    const radius = 0.6 + Math.pow(random(), 3) * 5;
    return (
      Array.from({ length: 7 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 7;
        const r = radius * (0.5 + random());
        return `${i ? "L" : "M"}${(x + Math.cos(angle) * r).toFixed(2)},${(y + Math.sin(angle) * r * 0.65).toFixed(2)}`;
      }).join(" ") + " Z"
    );
  });
}
