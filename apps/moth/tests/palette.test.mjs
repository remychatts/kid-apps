/** Checks that teaching bark adjustments preserve the original palette and moth-independent HSV value. */
import assert from "node:assert/strict";
import test from "node:test";
import { barkColour } from "../src/palette.ts";

test("left endpoint exactly preserves the original bark colours", () => {
  for (const shade of [0, 0.2, 0.5, 0.8, 1]) {
    assert.equal(barkColour(shade, 0), `hsl(68 12% ${23 + shade * 56}%)`);
  }
});

test("right endpoint compresses HSV value by ten percent while preserving saturation", () => {
  for (const shade of [0, 0.5, 1]) {
    const lightness = (23 + shade * 56) / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * 0.12;
    const value = lightness + chroma / 2;
    const channels = barkColour(shade, 1)
      .match(/[\d.]+/g)
      .map(Number)
      .map((n) => n / 255);
    const actualValue = Math.max(...channels);
    assert.ok(Math.abs(actualValue - (value + (0.5 - value) * 0.1)) < 0.00001);
    assert.ok(
      Math.abs(
        (actualValue - Math.min(...channels)) / actualValue - chroma / value,
      ) < 0.00001,
    );
    assert.equal(actualValue > value, shade === 0);
  }
});
