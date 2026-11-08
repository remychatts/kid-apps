/** Exercises history preservation, date boundaries and mosaic rollover. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  toggleGoal,
  rewards,
  cells,
  shapes,
  parseState,
  dayKey,
} from "../src/model.ts";
test("each goal earns one square per day; undo leaves other days alone", () => {
  let s = initialState("Alyx");
  s = toggleGoal(s, "starter-0", "2026-11-08");
  s = toggleGoal(s, "starter-0", "2026-11-07");
  assert.equal(s.entries.length, 2);
  s = toggleGoal(s, "starter-0", "2026-11-08");
  assert.equal(s.entries.length, 1);
  assert.equal(s.entries[0].day, "2026-11-07");
});
test("omitting a goal preserves its historical colour and rewards", () => {
  let s = toggleGoal(initialState("Alyx"), "starter-0", "2026-11-08");
  s.goals[0].omitted = true;
  assert.equal(parseState(JSON.parse(JSON.stringify(s))).entries.length, 1);
  assert.equal(rewards(s.entries).current.length, 1);
});
test("all silhouettes have around 70 cells and fill bottom upwards", () => {
  shapes.forEach((s, i) => {
    const squares = cells(i);
    assert.ok(squares.length >= 60 && squares.length <= 80, s.name);
    assert.ok(s.rows.every((row) => row.length === s.rows[0].length));
    assert.equal(
      new Set(squares.map((p) => `${p.x},${p.y}`)).size,
      squares.length,
    );
    for (let n = 1; n < squares.length; n++)
      assert.ok(squares[n].y <= squares[n - 1].y);
  });
});
test("medals recycle shapes and carry excess progress without losing a win", () => {
  const cycle = shapes.reduce((sum, _, i) => sum + cells(i).length, 0);
  const entries = Array.from({ length: cycle + 3 }, (_, i) => ({
    id: String(i),
    goal: "starter-0",
    day: "2026-11-08",
  }));
  const r = rewards(entries);
  assert.equal(r.medals.length, shapes.length);
  assert.equal(r.shape, 0);
  assert.equal(r.current.length, 3);
  assert.deepEqual(
    [...r.medals.flatMap((m) => m.entries), ...r.current],
    entries,
  );
  assert.equal(rewards(entries.slice(0, 72)).medals.length, 1);
  assert.equal(rewards(entries.slice(0, 71)).medals.length, 0);
});
test("backup validation rejects missing goals, duplicate ticks and impossible dates", () => {
  const s = toggleGoal(initialState("Alyx"), "starter-0", "2026-11-08");
  assert.throws(() =>
    parseState({ ...s, entries: [...s.entries, ...s.entries] }),
  );
  assert.throws(() => parseState({ ...s, goals: [] }));
  assert.throws(() =>
    parseState({ ...s, entries: [{ ...s.entries[0], day: "2026-02-30" }] }),
  );
  assert.equal(parseState(s).name, "Alyx");
});
test("calendar stepping crosses month and year boundaries", () => {
  assert.equal(dayKey(-1, new Date(2026, 0, 1, 12)), "2025-12-31");
  assert.equal(dayKey(-7, new Date(2026, 2, 3, 12)), "2026-02-24");
});
