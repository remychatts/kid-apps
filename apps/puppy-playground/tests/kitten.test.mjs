/** Exercises the textured kitten's exported rig and shared playback contract. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const base = new URL("../../../characters/", import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL("kitten/library/clips.json", base)),
);
const puppy = JSON.parse(
  await readFile(new URL("puppy/library/clips.json", base)),
);
const bytes = await readFile(
  new URL("kitten/library/kitten-library.glb", base),
);
const jsonLength = bytes.readUInt32LE(12);
const document = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binary = bytes.subarray(28 + jsonLength);
// Node has no browser image decoder. Validate embedded PNGs below and stub only
// decoding, retaining the real material, skeleton, animation and morph parsers.
const loader = new GLTFLoader().register(() => ({
  name: "TEST_image_decode",
  loadTexture: () => Promise.resolve(new THREE.Texture()),
}));
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const mixer = new THREE.AnimationMixer(gltf.scene);
const meshes = [];
gltf.scene.traverse((object) => {
  if (object.isMesh) meshes.push(object);
});

/** Samples actual exported tracks and updates the skinning matrices. */
function pose(id, time) {
  mixer.stopAllAction();
  const clip = gltf.animations.find((clip) => clip.name === id);
  const action = mixer
    .clipAction(clip)
    .reset()
    .setLoop(THREE.LoopOnce, 1)
    .play();
  action.clampWhenFinished = true;
  action.time = time;
  mixer.update(0);
  gltf.scene.updateMatrixWorld(true);
  for (const mesh of meshes) mesh.skeleton?.update();
}
/** Collects all object transforms and facial weights for neutral comparisons. */
function snapshot() {
  const values = [];
  gltf.scene.traverse((object) => {
    values.push(
      ...object.matrixWorld.elements,
      ...(object.morphTargetInfluences ?? []),
    );
  });
  return values;
}

test("kitten retains both embedded coat textures and stays within offline cache limit", () => {
  assert.equal(document.images.length, 2);
  for (const image of document.images) {
    const view = document.bufferViews[image.bufferView];
    assert.ok(view.byteOffset + view.byteLength <= binary.length);
    assert.deepEqual(
      [...binary.subarray(view.byteOffset, view.byteOffset + 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
  }
  assert.ok(bytes.length < 8 * 1024 * 1024);
  assert.ok(meshes.every((mesh) => mesh.isSkinnedMesh));
});

test("kitten has the puppy's complete clip, timing and protected-section contract", () => {
  assert.deepEqual(
    gltf.animations.map((clip) => clip.name),
    puppy.map((clip) => clip.id),
  );
  for (const [index, clip] of metadata.entries()) {
    for (const key of [
      "id",
      "duration",
      "protectedFrom",
      "protectedUntil",
      "loop",
    ]) {
      assert.equal(clip[key], puppy[index][key], `${clip.id}: ${key}`);
    }
    assert.ok(
      Math.abs(gltf.animations[index].duration - clip.duration) < 0.001,
    );
  }
});

test("every kitten clip starts and finishes in the seated neutral pose", () => {
  pose("neutral", 0);
  const neutral = snapshot();
  for (const clip of metadata) {
    for (const time of [0, clip.duration]) {
      pose(clip.id, time);
      const current = snapshot();
      assert.equal(current.length, neutral.length);
      assert.ok(
        current.every(
          (value, i) =>
            Number.isFinite(value) && Math.abs(value - neutral[i]) < 0.002,
        ),
        `${clip.id} at ${time}`,
      );
    }
  }
});

test("kitten facial gestures are baked into visible morph tracks", () => {
  for (const [id, time, key] of [
    ["Q2", 0.4, "Blink.L"],
    ["MIN1", 0.9, "SmileBroad"],
    ["F1", 0.6, "MouthRelax"],
    ["Q3-left", 1, "GazeLeft.L"],
  ]) {
    pose(id, time);
    assert.ok(
      meshes.some(
        (mesh) =>
          mesh.morphTargetInfluences?.[mesh.morphTargetDictionary?.[key]] > 0.3,
      ),
      key,
    );
  }
});

/** Samples deformed geometry throughout each gesture, including take-off and landing. */
test("retargeted kitten geometry stays finite and above the floor", () => {
  for (const clip of metadata) {
    for (let step = 0; step <= 10; step++) {
      const time = (clip.duration * step) / 10;
      pose(clip.id, time);
      let low = Infinity;
      for (const mesh of meshes) {
        const count = mesh.geometry.attributes.position.count;
        for (let i = 0; i < count; i += 8) {
          const p = mesh.localToWorld(
            mesh.getVertexPosition(i, new THREE.Vector3()),
          );
          assert.ok([p.x, p.y, p.z].every(Number.isFinite));
          low = Math.min(low, p.y);
        }
      }
      assert.ok(low > -0.015, `${clip.id} at ${time}: floor clearance ${low}`);
    }
  }
});
