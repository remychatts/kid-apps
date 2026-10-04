/** Verifies reproducibility, safe anatomy and the boundary between genetics and cosmetics. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  createSpecimen,
  featureRanges,
  makeMarkings,
  resolveFeatures,
} from "../src/specimen.ts";

test("changing form preserves a specimen's anatomy and pattern", () => {
  for (const seed of [0, 42, 107, 4294967295]) {
    const light = createSpecimen(seed, "typica");
    const dark = createSpecimen(seed, "carbonaria");
    assert.deepEqual(light.features, dark.features);
    assert.deepEqual(makeMarkings(light.seed), makeMarkings(dark.seed));
    assert.equal(light.form, "typica");
    assert.equal(dark.form, "carbonaria");
  }
});

test("cosmetics are reproducible and varied, with safe ranges across many seeds", () => {
  const looks = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const specimen = createSpecimen(seed, "typica");
    assert.deepEqual(specimen, createSpecimen(seed, "typica"));
    looks.add(JSON.stringify(specimen.features));
    for (const [key, range] of Object.entries(featureRanges)) {
      assert.ok(specimen.features[key] >= range.min);
      assert.ok(specimen.features[key] <= range.max);
    }
  }
  assert.equal(looks.size, 300);
  assert.notDeepEqual(makeMarkings(42), makeMarkings(43));
});

test("overrides clamp out-of-range values and reject non-finite geometry", () => {
  const features = resolveFeatures(42, {
    eyeSize: 100,
    eyeSpacing: -100,
    wingSpan: NaN,
    wingDepth: Infinity,
    antennaLength: 1,
  });
  assert.equal(features.eyeSize, featureRanges.eyeSize.max);
  assert.equal(features.eyeSpacing, featureRanges.eyeSpacing.min);
  assert.equal(features.wingSpan, resolveFeatures(42).wingSpan);
  assert.equal(features.wingDepth, resolveFeatures(42).wingDepth);
  assert.equal(features.antennaLength, 1);
});
