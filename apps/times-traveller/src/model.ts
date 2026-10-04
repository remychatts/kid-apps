/** Multiplication pools, resilient saved progress and first-try streak rewards. */
export type Settings = {
  limits: number[];
  eitherOrder: boolean;
  sound: boolean;
};
export type Progress = {
  score: number;
  streak: number;
  best: number;
  jumps: number;
};
export type Saved = { settings: Settings; progress: Progress };
export type Question = {
  factor: number;
  table: number;
  left: number;
  right: number;
};
export const STORAGE_KEY = "times-traveller-v1";
export const DEFAULT_SETTINGS: Settings = {
  limits: [0, 5, 5, 0, 0, 0, 0, 0, 0, 0],
  eitherOrder: false,
  sound: true,
};
export const EMPTY_PROGRESS: Progress = {
  score: 0,
  streak: 0,
  best: 0,
  jumps: 0,
};

/** Ignores malformed or out-of-range saved fields without preventing play. */
export function readSaved(raw: string | null): Saved {
  let value;
  try {
    value = JSON.parse(raw ?? "null");
  } catch {
    value = null;
  }
  const limits = value?.settings?.limits;
  const validLimits =
    Array.isArray(limits) &&
    limits.length === 10 &&
    limits.every(
      (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 10,
    ) &&
    limits.some((n: number) => n > 0);
  const progress = { ...EMPTY_PROGRESS };
  for (const key of Object.keys(progress) as (keyof Progress)[]) {
    const n = value?.progress?.[key];
    if (Number.isSafeInteger(n) && n >= 0) progress[key] = n;
  }
  progress.best = Math.max(progress.best, progress.streak);
  return {
    settings: {
      limits: validLimits ? [...limits] : [...DEFAULT_SETTINGS.limits],
      eitherOrder: value?.settings?.eitherOrder === true,
      sound: value?.settings?.sound !== false,
    },
    progress,
  };
}

/** Enumerates exactly the enabled facts, always multiplier first by default. */
export function questionPool(settings: Settings): Question[] {
  return settings.limits.flatMap((limit, index) =>
    Array.from({ length: limit }, (_, n) => ({
      factor: n + 1,
      table: index + 1,
      left: n + 1,
      right: index + 1,
    })),
  );
}

/** Picks a fact without an immediate repeat when alternatives exist. */
export function chooseQuestion(
  settings: Settings,
  previous?: Question,
  random = Math.random,
): Question {
  const pool = questionPool(settings);
  const alternatives = pool.filter(
    (q) => q.factor !== previous?.factor || q.table !== previous?.table,
  );
  const choices = alternatives.length ? alternatives : pool;
  const question = { ...choices[Math.floor(random() * choices.length)] };
  if (settings.eitherOrder && random() < 0.5)
    [question.left, question.right] = [question.right, question.left];
  return question;
}

/** Keeps every possible answer available, including non-products as distractors. */
export function maximumAnswer(settings: Settings): number {
  return Math.max(
    ...settings.limits.map((limit, index) => limit * (index + 1)),
  );
}

/** Rewards a solved fact; a retry earns points but cannot rebuild a first-try streak. */
export function reward(progress: Progress, firstTry: boolean): Progress {
  const streak = firstTry ? progress.streak + 1 : 0;
  return {
    score: progress.score + (firstTry ? 10 : 5),
    streak,
    best: Math.max(progress.best, streak),
    jumps: progress.jumps + (streak > 0 && streak % 10 === 0 ? 1 : 0),
  };
}
