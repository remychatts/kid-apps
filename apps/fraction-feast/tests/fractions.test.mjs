/** Verifies complete teaching sequences and exact area mappings. Run: npm test */
import assert from "node:assert/strict";
import test from "node:test";
import {
  CHALLENGE_ORDER,
  SHARE_OPTIONS,
  cellFillRank,
  fractionName,
  simplify,
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
            : Math.floor(column / (10 / shares));
        assert.equal(
          cellFillRank(index, shares) < (kept * 100) / shares,
          pieRegion < kept,
        );
      }
    }
  }
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
