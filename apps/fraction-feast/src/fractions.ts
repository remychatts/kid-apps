/** Provides the learning sequences and plain-English fraction names used by Fraction Feast. */

export const SHARE_OPTIONS = [2, 4, 5, 10] as const;
export type ShareCount = (typeof SHARE_OPTIONS)[number];

export const CHALLENGE_ORDER: Record<ShareCount, number[]> = {
  2: [1, 0, 2],
  4: [2, 1, 3, 0, 4],
  5: [2, 3, 1, 4, 0, 5],
  10: [5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10],
};

/** Finds the next feast, advancing to the next denominator when needed. */
export function nextChallenge(shares: ShareCount, problem: number) {
  if (problem < CHALLENGE_ORDER[shares].length - 1) {
    return { shares, problem: problem + 1, journeyComplete: false };
  }

  const shareIndex = SHARE_OPTIONS.indexOf(shares);
  const nextShares = SHARE_OPTIONS[shareIndex + 1];
  return nextShares
    ? { shares: nextShares, problem: 0, journeyComplete: false }
    : { shares: SHARE_OPTIONS[0], problem: 0, journeyComplete: true };
}

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
  if (shares !== 4) return index;
  const row = Math.floor(index / 10);
  const column = index % 10;
  const group = Math.floor(row / 5) * 2 + Math.floor(column / 5);
  return group * 25 + (row % 5) * 5 + (column % 5);
}
