/** Provides the learning sequences and plain-English fraction names used by Fraction Feast. */

export const SHARE_OPTIONS = [2, 4, 5, 10] as const;
export type ShareCount = (typeof SHARE_OPTIONS)[number];

export const CHALLENGE_ORDER: Record<ShareCount, number[]> = {
  2: [2, 0, 1],
  4: [4, 0, 2, 1, 3],
  5: [5, 0, 1, 2, 4, 3],
  10: [10, 0, 5, 1, 2, 4, 3, 6, 9, 8, 7],
};

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const PART_WORDS: Record<ShareCount, [string, string]> = {
  2: ["half", "halves"],
  4: ["quarter", "quarters"],
  5: ["fifth", "fifths"],
  10: ["tenth", "tenths"],
};

/** Names a fraction while giving the empty and whole endpoints natural language. */
export function fractionName(kept: number, shares: number) {
  if (kept === 0) return "none of the pie";
  if (kept === shares) return "one whole pie";
  const [singular, plural] = PART_WORDS[shares as ShareCount] ?? [
    "part",
    "parts",
  ];
  return `${NUMBER_WORDS[kept]} ${kept === 1 ? singular : plural}`;
}

/** Returns a fraction reduced to its simplest integer form. */
export function simplify(numerator: number, denominator: number) {
  if (numerator === 0) return [0, 1] as const;
  let left = numerator;
  let right = denominator;
  while (right) [left, right] = [right, left % right];
  return [numerator / left, denominator / left] as const;
}

/** Orders a physical hundred-square cell within equal, grid-aligned share regions. */
export function cellFillRank(index: number, shares: ShareCount) {
  const row = Math.floor(index / 10);
  const column = index % 10;
  if (shares === 4) {
    const group = Math.floor(row / 5) * 2 + Math.floor(column / 5);
    return group * 25 + (row % 5) * 5 + (column % 5);
  }
  const width = 10 / shares;
  const group = Math.floor(column / width);
  return group * (100 / shares) + row * width + (column % width);
}
