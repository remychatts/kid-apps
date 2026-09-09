/** Defines the guessing strategies and their pure, testable guess generation. */

export type AlgorithmId =
  "count-up" | "count-down" | "fan-out" | "tens" | "binary";

export type GuessResult = "too-low" | "too-high" | "correct";

export interface GuessRecord {
  guess: number;
  result: GuessResult;
}

export interface AlgorithmDefinition {
  id: AlgorithmId;
  name: string;
  shortDescription: string;
  explanation: string;
  example: number[];
  exampleMin: number;
  exampleMax: number;
  exampleTarget: number;
  colour: string;
  symbol: string;
}

export const ALGORITHMS: AlgorithmDefinition[] = [
  {
    id: "count-up",
    name: "Count up",
    shortDescription: "Start at 1",
    explanation:
      "Begin with 1, then try every number in order. It is brilliant when the secret is tiny — but a big number takes lots of turns.",
    example: [1, 2, 3, 4],
    exampleMin: 1,
    exampleMax: 5,
    exampleTarget: 4,
    colour: "#ff5a8a",
    symbol: "↗",
  },
  {
    id: "count-down",
    name: "Count down",
    shortDescription: "Start at 100",
    explanation:
      "Begin with 100, then step down one number at a time. Secrets near the top are quick; secrets near the bottom need patience.",
    example: [100, 99, 98, 97],
    exampleMin: 96,
    exampleMax: 100,
    exampleTarget: 97,
    colour: "#8f5bff",
    symbol: "↘",
  },
  {
    id: "fan-out",
    name: "Fan out",
    shortDescription: "Start at 50",
    explanation:
      "Start in the middle, then zigzag farther and farther away: 51, 49, 52, 48… It searches both sides, but only one step at a time.",
    example: [50, 51, 49, 52, 48],
    exampleMin: 47,
    exampleMax: 53,
    exampleTarget: 48,
    colour: "#00a9e8",
    symbol: "↔",
  },
  {
    id: "tens",
    name: "Tens first",
    shortDescription: "Leap, then count",
    explanation:
      "Jump through the tens to find the right group. Then count through just that group. Here, 20 is too high, so the secret must be between 10 and 20.",
    example: [10, 20, 11, 12],
    exampleMin: 8,
    exampleMax: 22,
    exampleTarget: 12,
    colour: "#ff8a00",
    symbol: "⇥",
  },
  {
    id: "binary",
    name: "Halve the gap",
    shortDescription: "Cut the choices in half",
    explanation:
      "Try the middle of all the possible numbers. Each answer removes about half the choices, so the search shrinks very quickly.",
    example: [50, 75, 62, 68],
    exampleMin: 48,
    exampleMax: 77,
    exampleTarget: 68,
    colour: "#24c875",
    symbol: "½",
  },
];

/** Looks up one algorithm definition by its stable identifier. */
export function getAlgorithm(id: AlgorithmId) {
  return ALGORITHMS.find((algorithm) => algorithm.id === id)!;
}

/** Returns the next guess for a strategy after the supplied responses. */
export function nextGuess(id: AlgorithmId, history: GuessRecord[]): number {
  if (id === "count-up") return Math.min(100, history.length + 1);
  if (id === "count-down") return Math.max(1, 100 - history.length);

  if (id === "fan-out") {
    const index = history.length;
    if (index === 0) return 50;
    const distance = Math.ceil(index / 2);
    return index % 2 === 1 ? 50 + distance : 50 - distance;
  }

  if (id === "tens") {
    const highTenIndex = history.findIndex(
      ({ guess, result }) => guess % 10 === 0 && result === "too-high",
    );
    if (highTenIndex === -1) return Math.min(100, (history.length + 1) * 10);
    const highTen = history[highTenIndex].guess;
    const firstInGroup = highTen === 10 ? 1 : highTen - 9;
    const counted = history.length - highTenIndex - 1;
    return Math.min(100, firstInGroup + counted);
  }

  let low = 1;
  let high = 100;
  for (const record of history) {
    if (record.result === "too-low") low = Math.max(low, record.guess + 1);
    if (record.result === "too-high") high = Math.min(high, record.guess - 1);
  }
  return Math.floor((low + high) / 2);
}

/** Runs an algorithm to completion without touching UI state. */
export function runAlgorithm(id: AlgorithmId, target: number): GuessRecord[] {
  const history: GuessRecord[] = [];
  while (history.length < 100) {
    const guess = nextGuess(id, history);
    const result: GuessResult =
      guess === target ? "correct" : guess < target ? "too-low" : "too-high";
    history.push({ guess, result });
    if (result === "correct") break;
  }
  return history;
}
