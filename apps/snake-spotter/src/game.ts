/** Pure helpers for creating Snake Spotter rounds and ranking local scores. */
import { ALL_SNAKE_NAMES, FEATURED_SNAKES } from "./species";
import type { SnakeSpecies } from "./species";

export type QuizRound = {
  snake: SnakeSpecies;
  options: string[];
};

export type ScoreEntry = {
  id: string;
  points: number;
  correct: number;
  playedAt: string;
};

/** Returns a shuffled copy using Fisher–Yates. */
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

/** Builds ten non-repeating photo questions with three answers from the wider pool. */
export function createQuiz(random = Math.random): QuizRound[] {
  return shuffle(FEATURED_SNAKES, random)
    .slice(0, 10)
    .map((snake) => {
      const distractors = shuffle(
        ALL_SNAKE_NAMES.filter((name) => name !== snake.name),
        random,
      ).slice(0, 3);
      return {
        snake,
        options: shuffle([snake.name, ...distractors], random),
      };
    });
}

/** Ranks the strongest ten scores, preferring accuracy when points tie. */
export function rankScores(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores]
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.correct - left.correct ||
        right.playedAt.localeCompare(left.playedAt),
    )
    .slice(0, 10);
}
