/** Checks teaching data and independent/retry/help rewards. Run: npm test */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  answerQuestion,
  changeSettings,
  chooseQuestion,
  CLASS_ORDER,
  nextQuestion,
  readSaved,
  startGame,
  useHelp,
} from "../src/model.ts";

const pool = JSON.parse(
  readFileSync(new URL("../sentence-pool.json", import.meta.url), "utf8"),
);
const nouns = JSON.parse(
  readFileSync(new URL("../noun-pool.json", import.meta.url), "utf8"),
);
const entries = pool.categories.flatMap((c) =>
  c.entries.map((e) => ({ ...e, category: c.name })),
);

/** Creates a deterministic identify question with a supplied saved record. */
function session(best = 0) {
  return startGame(
    entries,
    {
      settings: { level: 2, sound: true, reducedMotion: false },
      bests: { 2: best },
    },
    () => 0,
  );
}

/** Solves one question with the appropriate answer for either mechanic. */
function solve(game) {
  return answerQuestion(
    game,
    game.question.mode === "identify"
      ? game.question.wordClass
      : game.question.wordId,
  );
}

test("all 100 entries preserve target nouns, word alignment, feedback and valid descriptor links", () => {
  assert.equal(entries.length, 100);
  assert.equal(new Set(entries.map((e) => e.id)).size, 100);
  assert.deepEqual(pool.wordClassOrder, CLASS_ORDER);
  assert.equal(pool.defaultComplexityLevel, 2);
  assert.deepEqual(Object.keys(pool.wordClassGuides), CLASS_ORDER);
  for (const guide of Object.values(pool.wordClassGuides))
    assert.equal(guide.examples.length, 2);
  for (const [i, category] of pool.categories.entries()) {
    assert.equal(category.name, nouns.categories[i].name);
    assert.deepEqual(
      category.entries.map((e) => e.noun),
      nouns.categories[i].nouns,
    );
    for (const entry of category.entries) {
      assert.deepEqual(
        entry.text.match(/[\w]+(?:-[\w]+)*/g),
        entry.words.map((w) => w.word),
      );
      assert.ok(entry.words.some((w) => w.word.toLowerCase() === entry.noun));
      const words = new Map(entry.words.map((w) => [w.id, w]));
      assert.equal(words.size, entry.words.length);
      for (const word of entry.words) {
        assert.ok(CLASS_ORDER.includes(word.wordClass));
        assert.ok(word.hint && word.explanation);
      }
      const describing = entry.words.filter((w) =>
        ["adjective", "adverb"].includes(w.wordClass),
      );
      assert.ok(describing.some((w) => w.wordClass === "adjective"));
      assert.ok(describing.some((w) => w.wordClass === "adverb"));
      assert.deepEqual(
        new Set(entry.relationships.map((r) => r.sourceWordId)),
        new Set(describing.map((w) => w.id)),
      );
      for (const relation of entry.relationships) {
        const source = words.get(relation.sourceWordId);
        if (relation.scope === "clause") {
          assert.equal(source.wordClass, "adverb");
          assert.deepEqual(relation.targetWordIds, []);
        } else {
          assert.equal(relation.scope, "word");
          assert.equal(relation.targetWordIds.length, 1);
          assert.equal(
            words.get(relation.targetWordIds[0]).wordClass,
            source.wordClass === "adjective" ? "noun" : "verb",
          );
        }
      }
    }
  }
});

test("the same spellings occur across classes; moose, snake and girl protagonists remain", () => {
  const uses = new Map();
  for (const entry of entries)
    for (const word of entry.words) {
      const text = word.word.toLowerCase();
      if (!uses.has(text)) uses.set(text, new Set());
      uses.get(text).add(word.wordClass);
    }
  for (const text of [
    "paint",
    "dream",
    "doubt",
    "rain",
    "park",
    "nurse",
    "milk",
    "time",
  ])
    assert.deepEqual(uses.get(text), new Set(["noun", "verb"]));
  assert.deepEqual(uses.get("fast"), new Set(["adverb", "adjective"]));
  assert.ok(uses.has("moose") && uses.has("snake"));
  assert.match(entries.find((e) => e.noun === "child").text, /She/);
  assert.match(entries.find((e) => e.noun === "fear").text, /girl/);
  assert.ok(!uses.has("boy"));
});

test("saved configuration rejects corrupt values and keeps records isolated by level", () => {
  assert.equal(readSaved("broken").settings.level, 2);
  assert.equal(readSaved(null, true).settings.reducedMotion, true);
  const saved = readSaved(
    JSON.stringify({
      settings: { level: 99, sound: "yes", reducedMotion: 1 },
      bests: { 1: 12, 2: -3, 3: "50", 4: 2.5, 5: 9 },
    }),
  );
  assert.deepEqual(saved.settings, {
    level: 2,
    sound: true,
    reducedMotion: false,
  });
  assert.deepEqual(saved.bests, { 1: 12, 5: 9 });
});

test("both mechanics choose only accessible targets at every level and avoid the previous sentence", () => {
  for (let level = 1; level <= 7; level++)
    for (let seed = 0; seed < 100; seed++) {
      let current = seed + 1;
      const random = () => {
        current = (current * 16807) % 2147483647;
        return current / 2147483647;
      };
      const q = chooseQuestion(entries, level, {}, "dog", random);
      assert.ok(CLASS_ORDER.slice(0, level).includes(q.wordClass));
      assert.equal(
        q.entry.words.find((w) => w.id === q.wordId).wordClass,
        q.wordClass,
      );
      assert.notEqual(q.entry.id, "dog");
    }
  assert.equal(
    chooseQuestion(entries, 2, {}, undefined, () => 0).mode,
    "identify",
  );
  assert.equal(
    chooseQuestion(entries, 2, {}, undefined, () => 0.99).mode,
    "find",
  );
});

test("find mode accepts every matching word, not only its internal hint target", () => {
  const game = session();
  game.question.mode = "find";
  const valid = game.question.entry.words.filter(
    (w) => w.wordClass === game.question.wordClass,
  );
  assert.ok(valid.length > 1);
  for (const word of valid) {
    const result = answerQuestion(game, word.id);
    assert.equal(result.question.completed, true);
    assert.equal(result.question.answerWordId, word.id);
    assert.equal(result.points, 1);
  }
});

test("first answers earn one point; duplicate answers and advancing unsolved questions do nothing", () => {
  const game = session();
  assert.equal(nextQuestion(game, entries), game);
  const result = solve(game);
  assert.equal(result.points, 1);
  assert.equal(result.streak, 1);
  assert.equal(result.bests[2], 1);
  assert.equal(solve(result), result);
  assert.equal(result.stats.noun.firstCorrect, 1);
});

test("mistakes end a record streak once; repeated retries earn no points and restart at one", () => {
  let game = session(2);
  for (let i = 0; i < 10; i++)
    game = nextQuestion(solve(game), entries, () => 0);
  assert.equal(game.streak, 10);
  assert.equal(game.bests[2], 10);
  assert.equal(game.points, 10);
  game = answerQuestion(game, "incorrect");
  assert.equal(game.streak, 0);
  assert.equal(game.endedRecord, 10);
  game = answerQuestion(game, "incorrect-again");
  assert.equal(game.endedRecord, null);
  game = solve(game);
  assert.equal(game.streak, 1);
  assert.equal(game.points, 10);
  assert.equal(game.bests[2], 10);
  assert.equal(
    game.stats[game.question.wordClass].completed >
      game.stats[game.question.wordClass].firstCorrect,
    true,
  );
});

test("equal or lower streaks do not re-celebrate an existing record", () => {
  let game = session(3);
  for (let i = 0; i < 3; i++)
    game = nextQuestion(solve(game), entries, () => 0);
  assert.equal(answerQuestion(game, "incorrect").endedRecord, null);
});

test("help preserves the sentence, breaks independence once and awards only supported completion", () => {
  let game = nextQuestion(solve(session()), entries, () => 0);
  const original = game.question;
  game = useHelp(game);
  assert.equal(game.question.entry, original.entry);
  assert.equal(game.question.wordId, original.wordId);
  assert.equal(game.question.usedHelp, true);
  assert.equal(game.endedRecord, 1);
  assert.equal(game.streak, 0);
  assert.equal(useHelp(game), game);
  game = solve(game);
  assert.equal(game.points, 1);
  assert.equal(game.streak, 1);
  assert.equal(useHelp(game), game);
});

test("preference changes preserve the question; level changes start a new case and separate record", () => {
  let game = solve(session(12));
  const muted = changeSettings(
    game,
    { ...game.settings, sound: false },
    entries,
    () => 0,
  );
  assert.equal(muted.question, game.question);
  assert.equal(muted.streak, 1);
  game = changeSettings(
    muted,
    { ...muted.settings, level: 4 },
    entries,
    () => 0,
  );
  assert.equal(game.streak, 0);
  assert.equal(game.bests[2], 12);
  assert.equal(game.bests[4], undefined);
  assert.equal(game.caseNumber, 2);
  assert.equal(game.question.completed, false);
  assert.notEqual(game.question.entry.id, muted.question.entry.id);
});

test("adaptive practice covers every class, gently favours the newest and revisits weaker classes", () => {
  let game = session();
  game = changeSettings(game, { ...game.settings, level: 4 }, entries, () => 0);
  for (let i = 0; i < 80; i++) {
    if (game.question.wordClass === "verb")
      game = answerQuestion(game, "incorrect");
    game = nextQuestion(solve(game), entries, () => 0);
  }
  for (const kind of CLASS_ORDER.slice(0, 4))
    assert.ok(game.stats[kind].completed >= 10);
  assert.ok(game.stats.verb.shown > game.stats.noun.shown);
  assert.ok(game.stats.adverb.shown > game.stats.noun.shown);
});
