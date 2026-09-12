/** Verifies complete teaching sequences and exact area mappings. Run: npm test */
import assert from "node:assert/strict";
import test from "node:test";
import {
  CHALLENGE_ORDER,
  SHARE_OPTIONS,
  cellFillRank,
  fractionName,
  nextChallenge,
  shareGuidePath,
  simplify,
  startingPieKept,
} from "../src/fractions.ts";

test("each teaching sequence covers every amount once, including both endpoints", () => {
  for (const shares of SHARE_OPTIONS) {
    assert.deepEqual(
      [...CHALLENGE_ORDER[shares]].sort((a, b) => a - b),
      Array.from({ length: shares + 1 }, (_, index) => index),
    );
    for (const kept of CHALLENGE_ORDER[shares]) {
      assert.ok(Number.isInteger((kept * 100) / shares));
      const [top, bottom] = simplify(kept, shares);
      assert.equal(top / bottom, kept / shares);
    }
  }
});

test("teaching sequences start near one half, zig-zag outwards, and end at the endpoints", () => {
  assert.deepEqual(CHALLENGE_ORDER[2], [1, 0, 2]);
  assert.deepEqual(CHALLENGE_ORDER[4], [2, 1, 3, 0, 4]);
  assert.deepEqual(CHALLENGE_ORDER[5], [2, 3, 1, 4, 0, 5]);
  assert.deepEqual(CHALLENGE_ORDER[10], [5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10]);
});

test("the complete journey advances from one half through to ten tenths", () => {
  let shares = 2;
  let problem = 0;
  const journey = [];

  while (true) {
    journey.push(`${CHALLENGE_ORDER[shares][problem]}/${shares}`);
    const next = nextChallenge(shares, problem);
    if (next.journeyComplete) break;
    shares = next.shares;
    problem = next.problem;
  }

  assert.equal(journey[0], "1/2");
  assert.equal(journey.at(-1), "10/10");
  assert.equal(journey.length, 25);
});

test("a challenge never starts with the target pie value already selected", () => {
  for (const shares of SHARE_OPTIONS) {
    for (const targetKept of CHALLENGE_ORDER[shares]) {
      const start = startingPieKept(targetKept, shares);
      assert.notEqual(start, targetKept);
      assert.ok(start >= 0 && start <= shares);
    }
  }
});

test("the hundred-square contains exactly the selected number of cells for every percentage", () => {
  for (const shares of SHARE_OPTIONS) {
    const ranks = Array.from({ length: 100 }, (_, index) =>
      cellFillRank(index, shares),
    );
    assert.deepEqual(
      [...ranks].sort((a, b) => a - b),
      Array.from({ length: 100 }, (_, index) => index),
    );
    for (let percentage = 0; percentage <= 100; percentage++) {
      assert.equal(
        ranks.filter((rank) => rank < percentage).length,
        percentage,
      );
    }
  }
});

test("filled regions match the pie's equal rectangular shares", () => {
  for (const shares of SHARE_OPTIONS) {
    for (let kept = 0; kept <= shares; kept++) {
      for (let index = 0; index < 100; index++) {
        const row = Math.floor(index / 10);
        const column = index % 10;
        const pieRegion =
          shares === 4
            ? (row < 5 ? 0 : 2) + (column < 5 ? 0 : 1)
            : Math.floor(row / (10 / shares));
        assert.equal(
          cellFillRank(index, shares) < (kept * 100) / shares,
          pieRegion < kept,
        );
      }
    }
  }
});

test("four-share numbering runs through each quadrant in pie order", () => {
  const ranks = Array.from({ length: 100 }, (_, index) =>
    cellFillRank(index, 4),
  );
  assert.deepEqual(ranks.slice(0, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(ranks.slice(5, 10), [25, 26, 27, 28, 29]);
  assert.deepEqual(ranks.slice(50, 55), [50, 51, 52, 53, 54]);
  assert.deepEqual(ranks.slice(55, 60), [75, 76, 77, 78, 79]);
});

test("a matched amount has only one internal guide boundary", () => {
  assert.equal(shareGuidePath(0, 5), null);
  assert.equal(shareGuidePath(2, 5), "M 0 40 H 100");
  assert.equal(shareGuidePath(1, 2), "M 0 50 H 100");
  assert.equal(shareGuidePath(1, 4), "M 50 0 V 50 H 0");
  assert.equal(shareGuidePath(2, 4), "M 0 50 H 100");
  assert.equal(shareGuidePath(3, 4), "M 100 50 H 50 V 100");
  assert.equal(shareGuidePath(5, 5), null);
});

test("fraction words handle singular, plural, simplified amounts and endpoints", () => {
  assert.equal(fractionName(1, 2), "one half");
  assert.equal(fractionName(2, 4), "two quarters");
  assert.equal(fractionName(3, 4), "three quarters");
  assert.equal(fractionName(1, 5), "one fifth");
  assert.equal(fractionName(7, 10), "seven tenths");
  assert.equal(fractionName(0, 4), "none of the pie");
  assert.equal(fractionName(4, 4), "one whole pie");
  assert.deepEqual(simplify(2, 4), [1, 2]);
  assert.deepEqual(simplify(4, 10), [2, 5]);
});
