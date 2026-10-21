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

/** A lifted forepaw must not pull a sheet of belly or haunch up to the cheek. */
test("cheek scratch keeps the seated belly below its resting height", () => {
  const torso = meshes.find((mesh) => mesh.name.startsWith("Body"));
  assert.ok(torso, "seated torso is exported");
  pose("neutral", 0);
  const belly = [];
  for (let i = 0; i < torso.geometry.attributes.position.count; i++) {
    const p = torso.localToWorld(
      torso.getVertexPosition(i, new THREE.Vector3()),
    );
    // glTF is Y-up: Z < .12 selects belly/haunch behind the forelegs.
    if (p.y < 0.85 && p.z < 0.12 && Math.abs(p.x) > 0.15) {
      belly.push({ index: i, height: p.y });
    }
  }
  assert.ok(belly.length > 100, "sample belly and haunch surfaces");
  for (let step = 0; step <= 45; step++) {
    const time = step / 10;
    pose("Q6", time);
    for (const { index, height } of belly) {
      const p = torso.localToWorld(
        torso.getVertexPosition(index, new THREE.Vector3()),
      );
      assert.ok(
        p.y < height + 0.05,
        `belly vertex ${index} rises ${p.y - height} at ${time}s`,
      );
    }
  }
});

/** The foreleg rest bend must leave enough reach for a rising chest. */
test("kitten breathing keeps all four paws planted", () => {
  pose("neutral", 0);
  const paws = meshes
    .filter((mesh) => /^(Forepaw|Hind_paw)/.test(mesh.name))
    .map((mesh) => ({
      mesh,
      rest: mesh.localToWorld(mesh.getVertexPosition(0, new THREE.Vector3())),
    }));
  assert.equal(paws.length, 4);
  for (let step = 0; step <= 40; step++) {
    pose("Q1", step / 10);
    for (const { mesh, rest } of paws) {
      const current = mesh.localToWorld(
        mesh.getVertexPosition(0, new THREE.Vector3()),
      );
      assert.ok(
        current.distanceTo(rest) < 0.003,
        `${mesh.name} at ${step / 10}s`,
      );
    }
  }
});

/** Gaze layers must stay ahead of the stationary white, including between keys. */
test("kitten gaze keeps iris and pupil clear of the eye whites", () => {
  pose("neutral", 0);
  const raycaster = new THREE.Raycaster();
  raycaster.ray.direction.set(0, 0, -1);
  for (const side of ["L", "R"]) {
    const ending = side === "L" ? "1" : "-1";
    const white = meshes.find((mesh) => mesh.name === `Eye_ivory_${ending}`);
    assert.ok(white, `eye white ${side}`);
    const layers = ["Iris_outer_ring", "Blue_iris", "Pupil"].map((prefix) => {
      const mesh = meshes.find((mesh) => mesh.name === `${prefix}_${ending}`);
      assert.ok(mesh, `${prefix} ${side}`);
      return mesh;
    });
    for (const direction of ["GazeLeft", "GazeRight", "GazeUp", "GazeDown"]) {
      for (const weight of [0, 0.25, 0.5, 0.75, 1]) {
        for (const mesh of layers) {
          const index = mesh.morphTargetDictionary[`${direction}.${side}`];
          assert.notEqual(index, undefined);
          mesh.morphTargetInfluences[index] = weight;
          // Sample the full radial range and perimeter on the exported mesh.
          for (let i = 0; i < mesh.geometry.attributes.position.count; i += 4) {
            const p = mesh.localToWorld(
              mesh.getVertexPosition(i, new THREE.Vector3()),
            );
            raycaster.ray.origin.set(p.x, p.y, 4);
            const [hit] = raycaster.intersectObject(white, false);
            assert.ok(hit, `${mesh.name}: gaze stays within white`);
            assert.ok(
              p.z - hit.point.z > 0.0001,
              `${mesh.name} ${direction} at ${weight}: buried vertex ${i}`,
            );
          }
          mesh.morphTargetInfluences[index] = 0;
        }
      }
    }
  }
});
