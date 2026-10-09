/** Checks complete camera orbits and continuous framing through clip transitions. */
import test from "node:test";
import assert from "node:assert/strict";
import { sampleCamera } from "../src/camera.ts";

const neutral = { stageHeight: 3, stageRadius: 1.8 };
const flip = { stageHeight: 4.6, stageRadius: 2.3 };
const initial = { ...neutral, angle: 0.7 };

test("each clip makes exactly one orbit and returns to neutral framing", () => {
  for (const duration of [1.2, 3.5, 4]) {
    assert.deepEqual(
      sampleCamera(neutral, flip, initial, 0, duration, true),
      initial,
    );
    const end = sampleCamera(neutral, flip, initial, duration, duration, true);
    assert.equal(end.angle, initial.angle + 2 * Math.PI);
    assert.equal(end.stageHeight, neutral.stageHeight);
    assert.equal(end.stageRadius, neutral.stageRadius);
    const peak = sampleCamera(neutral, flip, initial, 0.6, duration, true);
    assert.equal(peak.stageHeight, flip.stageHeight);
  }
});

test("interruption starts at the current framing and settles without a camera cut", () => {
  const interrupted = sampleCamera(neutral, flip, initial, 1.3, 3.5, true);
  assert.deepEqual(
    sampleCamera(neutral, neutral, interrupted, 0, 1, false),
    interrupted,
  );
  const settled = sampleCamera(neutral, neutral, interrupted, 0.5, 1, false);
  assert.deepEqual(settled, { ...neutral, angle: interrupted.angle });
  const before = sampleCamera(neutral, flip, initial, 3.5 - 0.0001, 3.5, true);
  const after = sampleCamera(neutral, flip, initial, 3.5, 3.5, true);
  assert.ok(Math.abs(before.angle - after.angle) < 0.000001);
  assert.ok(Math.abs(before.stageHeight - after.stageHeight) < 0.000001);
});

test("non-rotating shots still animate framing and keep their chosen angle", () => {
  for (let t = 0; t <= 3.5; t += 0.05) {
    const shot = sampleCamera(neutral, flip, initial, t, 3.5, false);
    assert.equal(shot.angle, initial.angle);
    assert.ok(
      shot.stageHeight >= neutral.stageHeight &&
        shot.stageHeight <= flip.stageHeight,
    );
  }
});
