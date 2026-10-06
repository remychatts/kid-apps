/** Tests the exported puppy through the same Three.js loader and mixer as the app. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const bytes = await readFile(
  new URL(
    "../../../characters/puppy/animations/puppy-quiet.glb",
    import.meta.url,
  ),
);
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
const mixer = new THREE.AnimationMixer(gltf.scene);
const meshes = [];
gltf.scene.traverse((object) => {
  if (object instanceof THREE.Mesh) meshes.push(object);
});
const body = meshes.find((mesh) => mesh.name === "Puppy_body");
assert.ok(body, "The puppy body must be present");

/** Evaluates a clip at an exact local time and updates skinning matrices. */
function pose(name, time) {
  mixer.stopAllAction();
  const action = mixer
    .clipAction(clips.get(name))
    .reset()
    .setLoop(THREE.LoopOnce, 1)
    .play();
  action.clampWhenFinished = true;
  action.time = time;
  mixer.update(0);
  gltf.scene.updateMatrixWorld(true);
  for (const mesh of meshes) mesh.skeleton?.update();
}

/** Captures world transforms and facial weights for whole-pose comparisons. */
function snapshot() {
  const result = [];
  gltf.scene.traverse((object) => {
    result.push(...object.matrixWorld.elements);
    if (object.morphTargetInfluences)
      result.push(...object.morphTargetInfluences);
  });
  return result;
}

/** Reads a morphed and skinned body vertex in world coordinates. */
function vertex(index) {
  return body.localToWorld(body.getVertexPosition(index, new THREE.Vector3()));
}

pose("neutral", 0);
const neutral = snapshot();
const soles = [];
for (let index = 0; index < body.geometry.attributes.position.count; index++) {
  const position = vertex(index);
  if (position.y < 0.045) soles.push([index, position]);
}
assert.ok(soles.length > 20);

test("named Q1–Q4 clips include both curious-tilt variants and correct durations", () => {
  assert.deepEqual(
    [...clips.keys()],
    ["neutral", "Q1", "Q2", "Q3-left", "Q3-right", "Q4"],
  );
  for (const [name, duration] of [
    ["neutral", 0.2],
    ["Q1", 4],
    ["Q2", 1.2],
    ["Q3-left", 2.5],
    ["Q3-right", 2.5],
    ["Q4", 3.5],
  ]) {
    assert.ok(Math.abs(clips.get(name).duration - duration) < 0.00001);
    assert.ok(
      clips
        .get(name)
        .tracks.some((track) => track.name.includes("morphTargetInfluences")),
    );
  }
});

test("each quiet clip starts and finishes in the same smiling neutral pose", () => {
  for (const clip of clips.values()) {
    for (const time of [0, clip.duration]) {
      pose(clip.name, time);
      const current = snapshot();
      const error = Math.max(
        ...current.map((value, index) => Math.abs(value - neutral[index])),
      );
      assert.ok(
        error < 0.00001,
        `${clip.name} at ${time}: pose error ${error}`,
      );
    }
  }
});

test("all four paws stay planted through every exported animation frame", () => {
  for (const clip of clips.values()) {
    for (let frame = 0; frame <= Math.round(clip.duration * 30); frame++) {
      pose(clip.name, Math.min(clip.duration, frame / 30));
      for (const [index, original] of soles) {
        const drift = vertex(index).distanceTo(original);
        assert.ok(
          drift < 0.002,
          `${clip.name} frame ${frame}: sole drift ${drift}`,
        );
      }
    }
  }
});

test("gestures actually move, with a full blink and opposite head tilts", () => {
  for (const [name, time] of [
    ["Q1", 2],
    ["Q2", 0.4],
    ["Q3-left", 1.2],
    ["Q3-right", 1.2],
    ["Q4", 1.1],
  ]) {
    pose(name, time);
    assert.ok(
      snapshot().some(
        (value, index) => Math.abs(value - neutral[index]) > 0.005,
      ),
      `${name} must visibly change the pose`,
    );
  }
  pose("Q2", 0.4);
  for (const mesh of meshes.filter((mesh) =>
    /(?:Upper|Lower)_lid/.test(mesh.name),
  )) {
    const name = Object.keys(mesh.morphTargetDictionary).find((key) =>
      key.startsWith("Blink."),
    );
    assert.ok(name);
    assert.ok(
      mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] > 0.999,
    );
  }
  const head = gltf.scene.getObjectByName("head");
  pose("Q3-left", 1.2);
  const left = head.quaternion.clone();
  pose("Q3-right", 1.2);
  assert.ok(left.angleTo(head.quaternion) > THREE.MathUtils.degToRad(25));
});
