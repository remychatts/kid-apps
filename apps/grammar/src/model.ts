/** Pure question selection, retry, help and streak rules for Word Detective. */
import type {
  Entry,
  Game,
  Question,
  Settings,
  Stats,
  WordClass,
} from "./types.ts";

export const CLASS_ORDER: WordClass[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "determiner",
  "pronoun",
  "preposition",
];
export const STORAGE_KEY = "word-detective:v1";
export type Saved = { settings: Settings; bests: Record<string, number> };

/** Reads only valid saved settings and per-level records, including blocked/corrupt storage fallbacks. */
export function readSaved(
  raw: string | null,
  prefersReducedMotion = false,
): Saved {
  const defaults: Saved = {
    settings: { level: 2, sound: true, reducedMotion: prefersReducedMotion },
    bests: {},
  };
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value !== "object") return defaults;
    const settings = value.settings;
    if (settings && typeof settings === "object") {
      if (
        Number.isInteger(settings.level) &&
        settings.level >= 1 &&
        settings.level <= 7
      )
        defaults.settings.level = settings.level;
      if (typeof settings.sound === "boolean")
        defaults.settings.sound = settings.sound;
      if (typeof settings.reducedMotion === "boolean")
        defaults.settings.reducedMotion = settings.reducedMotion;
    }
    for (let level = 1; level <= 7; level++) {
      const best = value.bests?.[String(level)];
      if (Number.isSafeInteger(best) && best >= 0)
        defaults.bests[String(level)] = best;
    }
  } catch {
    /* Start safely if a browser has damaged or old saved data. */
  }
  return defaults;
}

/** Picks an item with an injectable random source for reproducible checks. */
function pick<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

/** Balances class coverage, with extra turns for new classes and weaker first-attempt accuracy. */
export function chooseQuestion(
  pool: Entry[],
  level: number,
  stats: Stats,
  previousId?: string,
  random = Math.random,
): Question {
  const available = CLASS_ORDER.slice(0, level).filter((kind) =>
    pool.some((entry) => entry.words.some((word) => word.wordClass === kind)),
  );
  const priorities = available.map((kind) => {
    const count = stats[kind] || { shown: 0, completed: 0, firstCorrect: 0 };
    const weakness = count.completed
      ? 1 - count.firstCorrect / count.completed
      : 0;
    const newest = kind === CLASS_ORDER[level - 1] && level > 2 ? 0.35 : 0;
    return { kind, score: count.shown / (1 + weakness * 0.7 + newest) };
  });
  const minimum = Math.min(...priorities.map((p) => p.score));
  const kind = pick(
    priorities.filter((p) => Math.abs(p.score - minimum) < 0.0001),
    random,
  ).kind;
  const matching = pool.filter((entry) =>
    entry.words.some((word) => word.wordClass === kind),
  );
  const fresh = matching.filter((entry) => entry.id !== previousId);
  const entry = pick(fresh.length ? fresh : matching, random);
  const word = pick(
    entry.words.filter((word) => word.wordClass === kind),
    random,
  );
  return {
    entry,
    mode: random() < 0.5 ? "identify" : "find",
    wordId: word.id,
    wordClass: kind,
    attempted: false,
    usedHelp: false,
    completed: false,
  };
}

/** Records the chosen class as seen, without yet counting an answer. */
function showQuestion(game: Game, question: Question): Game {
  const previous = game.stats[question.wordClass] || {
    shown: 0,
    completed: 0,
    firstCorrect: 0,
  };
  return {
    ...game,
    question,
    stats: {
      ...game.stats,
      [question.wordClass]: { ...previous, shown: previous.shown + 1 },
    },
  };
}

/** Creates a fresh practice session while retaining saved configuration and records. */
export function startGame(
  pool: Entry[],
  saved: Saved,
  random = Math.random,
): Game {
  const question = chooseQuestion(
    pool,
    saved.settings.level,
    {},
    undefined,
    random,
  );
  return showQuestion(
    {
      ...saved,
      points: 0,
      streak: 0,
      baseline: saved.bests[String(saved.settings.level)] || 0,
      stats: {},
      question,
      caseNumber: 1,
      endedRecord: null,
    },
    question,
  );
}

/** Ends an independent streak and celebrates it only when it beat the record at its start. */
function breakStreak(game: Game): Game {
  return {
    ...game,
    streak: 0,
    baseline: game.bests[String(game.settings.level)] || 0,
    endedRecord: game.streak > game.baseline ? game.streak : null,
  };
}

/** Accepts any matching word in find mode, and distinguishes first answers from retries/help. */
export function answerQuestion(game: Game, answer: string): Game {
  if (game.question.completed) return game;
  const q = game.question;
  const chosen = q.entry.words.find((word) => word.id === answer);
  const correct =
    q.mode === "identify"
      ? answer === q.wordClass
      : chosen?.wordClass === q.wordClass;
  if (!correct) {
    const broken =
      q.attempted || q.usedHelp
        ? { ...game, endedRecord: null }
        : breakStreak(game);
    return {
      ...broken,
      question: { ...q, attempted: true, wrongAnswer: answer },
    };
  }
  const first = !q.attempted && !q.usedHelp;
  const streak = first ? game.streak + 1 : 1;
  const bests = {
    ...game.bests,
    [String(game.settings.level)]: Math.max(
      game.bests[String(game.settings.level)] || 0,
      streak,
    ),
  };
  const previous = game.stats[q.wordClass] || {
    shown: 1,
    completed: 0,
    firstCorrect: 0,
  };
  return {
    ...game,
    bests,
    points: game.points + (first ? 1 : 0),
    streak,
    endedRecord: null,
    stats: {
      ...game.stats,
      [q.wordClass]: {
        ...previous,
        completed: previous.completed + 1,
        firstCorrect: previous.firstCorrect + (first ? 1 : 0),
      },
    },
    question: {
      ...q,
      completed: true,
      answerWordId: q.mode === "find" ? answer : q.wordId,
      wrongAnswer: undefined,
    },
  };
}

/** Marks help as supported practice and resets the streak once, preserving the current question. */
export function useHelp(game: Game): Game {
  if (game.question.completed || game.question.usedHelp) return game;
  return {
    ...breakStreak(game),
    question: { ...game.question, usedHelp: true },
  };
}

/** Moves to a fresh sentence only after the current question has been solved. */
export function nextQuestion(
  game: Game,
  pool: Entry[],
  random = Math.random,
): Game {
  if (!game.question.completed) return game;
  const question = chooseQuestion(
    pool,
    game.settings.level,
    game.stats,
    game.question.entry.id,
    random,
  );
  return showQuestion(
    { ...game, caseNumber: game.caseNumber + 1, endedRecord: null },
    question,
  );
}

/** Applies preferences; a changed level starts a new question and an independent streak. */
export function changeSettings(
  game: Game,
  settings: Settings,
  pool: Entry[],
  random = Math.random,
): Game {
  if (settings.level === game.settings.level) return { ...game, settings };
  const ended = breakStreak(game);
  const question = chooseQuestion(
    pool,
    settings.level,
    game.stats,
    game.question.entry.id,
    random,
  );
  return showQuestion(
    {
      ...ended,
      settings,
      baseline: game.bests[String(settings.level)] || 0,
      caseNumber: game.caseNumber + 1,
    },
    question,
  );
}
