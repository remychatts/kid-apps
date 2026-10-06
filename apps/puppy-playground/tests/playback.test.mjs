/** Checks interruption protection and latest-request playback for the authored clips. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canInterrupt, createPlaybackQueue } from "../src/playback.ts";

const library = JSON.parse(
  await readFile(
    new URL("../../../characters/puppy/library/clips.json", import.meta.url),
    "utf8",
  ),
);

test("scratch, chase, jump and flip own their unsupported section", () => {
  for (const [name, time] of [
    ["Q6", 2],
    ["MIN3", 0.95],
    ["MAJ1", 2.1],
    ["MAJ2", 1.3],
  ]) {
    const clip = library.find((clip) => clip.id === name);
    assert.equal(canInterrupt(clip, 0), true);
    assert.equal(canInterrupt(clip, time), false);
    assert.equal(canInterrupt(clip, clip.protectedUntil), true);
    assert.ok(clip.protectedUntil < clip.duration);
  }
  assert.equal(
    canInterrupt(
      library.find((clip) => clip.id === "Q2"),
      0.4,
    ),
    true,
  );
});

test("only the latest request is retained until a safe landing", () => {
  const queue = createPlaybackQueue(library);
  assert.equal(queue.request("F1", "MAJ2", 1.3), null);
  assert.equal(queue.pending, "F1");
  assert.equal(queue.request("MIN1", "MAJ2", 1.4), null);
  assert.equal(queue.pending, "MIN1");
  assert.equal(queue.take("MAJ2", 2.19), null);
  assert.equal(queue.take("MAJ2", 2.2), "MIN1");
  assert.equal(queue.pending, null);
  assert.equal(queue.take("MAJ2", 2.3), null);
});

test("neutral reset waits for support, quiet gestures fade immediately, and hidden queues clear", () => {
  const queue = createPlaybackQueue(library);
  assert.equal(queue.request("neutral", "Q6", 2), null);
  assert.equal(queue.take("Q6", 3.6), "neutral");
  assert.equal(queue.request("Q2", "Q3-left", 1), "Q2");
  queue.request("F3", "MIN3", 1);
  queue.clear();
  assert.equal(queue.take("MIN3", 2), null);
  queue.request("F1", "MAJ1", 2);
  assert.equal(queue.take("MAJ1", 4.5, true), "F1");
  assert.equal(queue.request("missing", "Q2", 0), null);
});
