/** Verifies configured facts, saved data and milestone scoring. Run: npm test */
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  EMPTY_PROGRESS,
  questionPool,
  maximumAnswer,
  chooseQuestion,
  readSaved,
  reward,
} from "../src/model.ts";

test("defaults ask multiplier first for exactly ten facts with answers 1–15", () => {
  const pool = questionPool(DEFAULT_SETTINGS);
  assert.equal(pool.length, 10);
  assert.equal(maximumAnswer(DEFAULT_SETTINGS), 15);
  assert.deepEqual(
    pool.map((q) => [q.left, q.right]),
    [1, 2, 3, 4, 5]
      .map((n) => [n, 2])
      .concat([1, 2, 3, 4, 5].map((n) => [n, 3])),
  );
});
test("all configurable limits include their answers through 10×10", () => {
  for (let table = 1; table <= 10; table++)
    for (let limit = 1; limit <= 10; limit++) {
      const settings = {
        ...DEFAULT_SETTINGS,
        limits: Array.from({ length: 10 }, (_, i) =>
          i === table - 1 ? limit : 0,
        ),
      };
      assert.equal(questionPool(settings).length, limit);
      assert.equal(maximumAnswer(settings), table * limit);
      for (const q of questionPool(settings))
        assert.ok(q.left * q.right <= maximumAnswer(settings));
    }
});
test("either order swaps only when enabled and repeat avoidance handles a single fact", () => {
  const previous = chooseQuestion(DEFAULT_SETTINGS, undefined, () => 0);
  const next = chooseQuestion(DEFAULT_SETTINGS, previous, () => 0);
  assert.notDeepEqual(next, previous);
  const settings = {
    ...DEFAULT_SETTINGS,
    limits: [0, 0, 5, 0, 0, 0, 0, 0, 0, 0],
  };
  assert.deepEqual(
    [
      chooseQuestion(settings, undefined, () => 0).left,
      chooseQuestion(settings, undefined, () => 0).right,
    ],
    [1, 3],
  );
  const reversed = chooseQuestion(
    { ...settings, eitherOrder: true },
    undefined,
    () => 0,
  );
  assert.deepEqual([reversed.left, reversed.right], [3, 1]);
  const unchanged = chooseQuestion(
    { ...settings, eitherOrder: true },
    undefined,
    () => 0.9,
  );
  assert.deepEqual([unchanged.left, unchanged.right], [5, 3]);
  const single = { ...settings, limits: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
  assert.equal(chooseQuestion(single, chooseQuestion(single)).left, 1);
});
test("milestones occur every ten first-try answers, retries reset streak and retain best", () => {
  let progress = { ...EMPTY_PROGRESS };
  for (let n = 1; n <= 20; n++) {
    progress = reward(progress, true);
    assert.equal(progress.jumps, Math.floor(n / 10));
  }
  assert.deepEqual(progress, { score: 200, streak: 20, best: 20, jumps: 2 });
  assert.deepEqual(reward(progress, false), {
    score: 205,
    streak: 0,
    best: 20,
    jumps: 2,
  });
});
test("saved configuration and progress round-trip and corrupt fields fall back safely", () => {
  assert.deepEqual(readSaved("broken"), readSaved(null));
  for (const limits of [
    [],
    Array(10).fill(0),
    Array(10).fill(11),
    Array(10).fill(1.5),
  ])
    assert.deepEqual(
      readSaved(JSON.stringify({ settings: { limits } })).settings.limits,
      DEFAULT_SETTINGS.limits,
    );
  const saved = {
    settings: { ...DEFAULT_SETTINGS, eitherOrder: true, sound: false },
    progress: { score: 50, streak: 5, best: 7, jumps: 3 },
  };
  assert.deepEqual(readSaved(JSON.stringify(saved)), saved);
  assert.deepEqual(
    readSaved('{"progress":{"score":-1,"streak":1.2,"best":"4"}}').progress,
    EMPTY_PROGRESS,
  );
});
