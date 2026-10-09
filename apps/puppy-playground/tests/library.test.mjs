/** Measures the complete exported clip library using real Three.js skinning and morphs. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const base = new URL("../../../characters/puppy/library/", import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL("clips.json", base), "utf8"),
);
const bytes = await readFile(new URL("puppy-library.glb", base));
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
assert.ok(body);

/** Evaluates the actual exported skin and facial animation at an exact time. */
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
/** Captures complete world transforms and facial weights. */
function snapshot() {
  const result = [];
  gltf.scene.traverse((object) => {
    result.push(...object.matrixWorld.elements);
    if (object.morphTargetInfluences)
      result.push(...object.morphTargetInfluences);
  });
  return result;
}
/** Returns a deformed body vertex in world coordinates. */
function vertex(index) {
  return body.localToWorld(body.getVertexPosition(index, new THREE.Vector3()));
}
/** Reads an exported facial weight without relying on mesh ordering. */
function weight(name) {
  const mesh = meshes.find(
    (mesh) => mesh.morphTargetDictionary?.[name] !== undefined,
  );
  assert.ok(mesh, `Missing facial control ${name}`);
  return mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]];
}
pose("neutral", 0);
const neutral = snapshot();
const soles = [];
for (let index = 0; index < body.geometry.attributes.position.count; index++) {
  const point = vertex(index);
  if (point.y < 0.045)
    soles.push({
      index,
      point,
      leg: `${point.z > 0 ? "front" : "hind"}.${point.x > 0 ? "L" : "R"}`,
    });
}
assert.ok(soles.length > 40);

test("all 18 named clips match metadata and return to the same smiling neutral pose", () => {
  assert.deepEqual(
    [...clips.keys()],
    [
      "neutral",
      "Q1",
      "Q2",
      "Q3-left",
      "Q3-right",
      "Q4",
      "Q5-left",
      "Q5-right",
      "Q6",
      "MIN1",
      "MIN2",
      "MIN3",
      "MAJ1",
      "MAJ2",
      "MAJ3",
      "F1",
      "F2",
      "F3",
    ],
  );
  for (const specification of metadata) {
    const clip = clips.get(specification.id);
    assert.ok(Math.abs(clip.duration - specification.duration) < 0.00001);
    for (const time of [0, clip.duration]) {
      pose(clip.name, time);
      const current = snapshot();
      const error = Math.max(
        ...current.map((value, index) => Math.abs(value - neutral[index])),
      );
      assert.ok(
        error < 0.00003,
        `${clip.name} at ${time}: neutral error ${error}`,
      );
    }
  }
});

test("quiet gestures, bow, tall ears and reassurance keep four paws planted; scratch keeps three", () => {
  for (const clip of clips.values()) {
    if (["MIN3", "MAJ1", "MAJ2"].includes(clip.name)) continue;
    for (let frame = 0; frame <= Math.round(clip.duration * 60); frame++) {
      pose(clip.name, Math.min(clip.duration, frame / 60));
      for (const sole of soles) {
        if (
          clip.name === "Q6" &&
          sole.leg === "hind.L" &&
          frame / 60 > 0.8 &&
          frame / 60 < 3.5
        )
          continue;
        const drift = vertex(sole.index).distanceTo(sole.point);
        assert.ok(
          drift < 0.003,
          `${clip.name} ${frame / 60}: ${sole.leg} sole drift ${drift}`,
        );
      }
    }
  }
});

test("jump and backflip clear the ground during flight and restore grounded landings", () => {
  for (const [name, launch, land] of [
    ["MIN3", 0.75, 1.15],
    ["MAJ2", 0.85, 1.7],
  ]) {
    let peak = 0;
    for (let step = Math.floor(launch * 120) + 1; step < land * 120; step++) {
      pose(name, step / 120);
      let low = Infinity;
      for (
        let index = 0;
        index < body.geometry.attributes.position.count;
        index++
      )
        low = Math.min(low, vertex(index).y);
      assert.ok(
        low > -0.002,
        `${name} at ${step / 120}: floor clearance ${low}`,
      );
      peak = Math.max(peak, low);
    }
    assert.ok(peak > 0.2, `${name} must leave the floor`);
    pose(name, clips.get(name).duration);
    for (const sole of soles)
      assert.ok(vertex(sole.index).distanceTo(sole.point) < 0.003);
  }
});

test("airborne motion keeps accelerating downwards right through the approach to landing", () => {
  const root = gltf.scene.getObjectByName("root");
  assert.ok(root);
  for (const [name, launch, land] of [
    ["MIN3", 0.75, 1.15],
    ["MAJ2", 0.85, 1.7],
  ]) {
    // Track the flip's body-centred pivot, not the rotating root origin or paws.
    const pivot =
      name === "MAJ2" ? new THREE.Vector3(0, 1.3, -0.1) : new THREE.Vector3();
    const heights = [];
    for (
      let frame = Math.round(launch * 60);
      frame <= Math.round(land * 60);
      frame++
    ) {
      pose(name, frame / 60);
      heights.push(root.localToWorld(pivot.clone()).y);
    }
    for (let frame = 1; frame < heights.length - 1; frame++) {
      const acceleration =
        (heights[frame + 1] - 2 * heights[frame] + heights[frame - 1]) *
        60 ** 2;
      assert.ok(
        acceleration < -10 && acceleration > -18,
        `${name} flight frame ${frame}: downward acceleration ${acceleration}`,
      );
    }
    pose(name, land);
    for (const sole of soles)
      assert.ok(
        vertex(sole.index).distanceTo(sole.point) < 0.003,
        `${name} lands on all four paws`,
      );
  }
});

test("tail chase plants alternating diagonal paws between swings without sliding", () => {
  for (const leg of ["front.L", "front.R", "hind.L", "hind.R"]) {
    const first = ["front.L", "hind.R"].includes(leg) ? 1 : 1.14;
    const selected = soles.filter((sole) => sole.leg === leg);
    assert.ok(selected.length > 10);
    for (let cycle = 0; cycle < 9; cycle++) {
      const start = first + cycle * 0.28 + 0.16;
      pose("MAJ1", start);
      const points = selected.map((sole) => vertex(sole.index));
      pose("MAJ1", start + 0.08);
      for (let index = 0; index < selected.length; index++) {
        const drift = vertex(selected[index].index).distanceTo(points[index]);
        assert.ok(
          drift < 0.003,
          `${leg} cycle ${cycle}: stance drift ${drift}`,
        );
      }
    }
  }
});

test("new gestures change the pose, and encouragement restores the smile promptly", () => {
  for (const specification of metadata.filter(
    (clip) => clip.sample !== undefined,
  )) {
    pose(specification.id, specification.sample);
    assert.ok(
      snapshot().some(
        (value, index) => Math.abs(value - neutral[index]) > 0.02,
      ),
      `${specification.id} must visibly move`,
    );
  }
  for (const [name, sympathy, recovery] of [
    ["F1", 0.6, 1.6],
    ["F2", 0.6, 1.5],
    ["F3", 0.5, 2.1],
  ]) {
    pose(name, sympathy);
    assert.ok(weight("MouthRelax") > 0.5, `${name} sympathetic mouth`);
    pose(name, recovery);
    assert.ok(weight("MouthRelax") < 0.01, `${name} restored smile`);
  }
  const ear = meshes.find((mesh) => mesh.name === "Left_floppy_ear");
  assert.ok(ear);
  pose("MAJ3", 1.1);
  let high = 0;
  for (let index = 0; index < ear.geometry.attributes.position.count; index++)
    high = Math.max(
      high,
      ear.localToWorld(ear.getVertexPosition(index, new THREE.Vector3())).y,
    );
  assert.ok(high > 3.5, "Happy surprise must unfold ears above the head");
});

test("breathing visibly expands the chest and the play bow points the nose down", () => {
  pose("neutral", 0);
  const rest = Array.from(
    { length: body.geometry.attributes.position.count },
    (_, index) => vertex(index),
  );
  const head = gltf.scene.getObjectByName("head");
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
    head.getWorldQuaternion(new THREE.Quaternion()),
  );
  pose("Q1", 2);
  const expansion = Math.max(
    ...rest.map((point, index) => vertex(index).distanceTo(point)),
  );
  assert.ok(
    expansion > 0.04,
    `Chest expansion should be visible: ${expansion}`,
  );
  pose("MIN2", 1);
  const bowed = new THREE.Vector3(0, 0, 1).applyQuaternion(
    head.getWorldQuaternion(new THREE.Quaternion()),
  );
  assert.ok(
    bowed.y < direction.y - 0.2,
    "Bow must angle the muzzle towards the floor",
  );
});

test("every small win and big celebration deepens the smile", () => {
  for (const name of ["MIN1", "MIN2", "MIN3", "MAJ1", "MAJ2", "MAJ3"]) {
    pose(name, 1);
    assert.ok(weight("SmileBroad") >= 0.84, `${name} needs a pronounced smile`);
  }
});
