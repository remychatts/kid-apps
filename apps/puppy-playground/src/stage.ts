/** Renders the baked puppy clips, with demand rendering and a neutral rest pose. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import puppyUrl from "../../../characters/puppy/library/puppy-library.glb?url";

import library from "../../../characters/puppy/library/clips.json";
import { createPlaybackQueue } from "./playback";

export type View = "hero" | "front" | "side";
export type Stage = {
  play: (name: string) => void;
  setView: (view: View) => void;
  setSpeed: (speed: number) => void;
  setMotionAllowed: (allowed: boolean) => void;
  dispose: () => void;
};

/** Creates a touch-friendly review stage and reports the current named clip. */
export function createStage(
  host: HTMLDivElement,
  onReady: (names: string[]) => void,
  onChange: (name: string, pending: string | null) => void,
  onError: (message: string) => void,
): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "A tan and cream cartoon puppy standing on four paws",
  );
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xfff5e6, 0xb4aa95, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-3, 6, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = light.shadow.camera.bottom = -3;
  light.shadow.camera.right = light.shadow.camera.top = 3;
  light.shadow.normalBias = 0.025;
  scene.add(light);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 64),
    new THREE.MeshStandardMaterial({ color: 0xe9dec9, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.013;
  floor.receiveShadow = true;
  scene.add(floor);

  let mixer: THREE.AnimationMixer | undefined;
  let model: THREE.Group | undefined;
  let action: THREE.AnimationAction | undefined;
  const clips = new Map<string, THREE.AnimationClip>();
  let active = "neutral";
  let view: View = "hero";
  const queue = createPlaybackQueue(library);
  let motionAllowed = true;
  let disposed = false;
  let request = 0;
  let previous = 0;
  let fadingUntil = 0;
  let speed = 1;
  let outgoing: THREE.AnimationAction | undefined;

  /** Draws once, then schedules frames only while a clip or transition is active. */
  function draw(now: number) {
    request = 0;
    if (disposed || document.hidden) return;
    const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    if (mixer) {
      mixer.update(delta * speed);
      const next = queue.take(active, action?.time ?? 0);
      if (next) start(next);
      if (outgoing && mixer.time >= fadingUntil) {
        outgoing.stop();
        outgoing = undefined;
        setView(view);
      }
    }
    renderer.render(scene, camera);
    if (active !== "neutral" || outgoing) invalidate();
    else previous = 0;
  }

  /** Requests a frame without starting duplicate rendering loops. */
  function invalidate() {
    if (!disposed && !document.hidden && !request)
      request = requestAnimationFrame(draw);
  }

  /** Defers requests until a full-body clip has support, retaining only the latest click. */
  function play(name: string) {
    if (!mixer || !clips.has(name) || (!motionAllowed && name !== "neutral"))
      return;
    const next = queue.request(name, active, action?.time ?? 0);
    if (next) start(next);
    else onChange(active, queue.pending);
  }

  /** Blends a safe new action from its neutral entry and updates the review framing. */
  function start(name: string) {
    if (!mixer || !clips.has(name) || (!motionAllowed && name !== "neutral"))
      return;
    if (outgoing) outgoing.stop();
    outgoing = undefined;
    const next = mixer.clipAction(clips.get(name)!);
    if (next === action) {
      next.reset();
    } else {
      next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
      next.setLoop(name === "Q1" ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = true;
      next.play();
      if (action) {
        outgoing = action;
        next.crossFadeFrom(action, 0.25, false);
        fadingUntil = mixer.time + 0.25;
      }
    }
    action = next;
    active = name;
    onChange(name, queue.pending);
    setView(view);
    invalidate();
  }

  /** Frames the complete puppy from one of the three review viewpoints. */
  function setView(nextView: View) {
    view = nextView;
    const positions: Record<View, [number, number, number]> = {
      hero: [4.6, 3.3, 6.9],
      front: [0, 3.0, 8.3],
      side: [8.3, 2.9, 0],
    };
    const bounds = library.find((clip) => clip.id === active)!;
    // Keep taller outgoing poses inside the stage throughout the return blend.
    const fadingBounds = library.find(
      (clip) => clip.id === outgoing?.getClip().name,
    );
    const stageHeight = Math.max(
      bounds.stageHeight,
      fadingBounds?.stageHeight ?? 0,
    );
    const stageRadius = Math.max(
      bounds.stageRadius,
      fadingBounds?.stageRadius ?? 0,
    );
    const height = stageHeight + 0.35;
    const width = stageRadius * 2 + 0.3;
    const distance =
      (0.65 * Math.max(height, width / Math.max(0.6, camera.aspect))) /
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const target = new THREE.Vector3(0, stageHeight / 2, 0);
    camera.position.copy(
      new THREE.Vector3(...positions[view])
        .sub(new THREE.Vector3(0, 1.5, 0))
        .normalize()
        .multiplyScalar(distance)
        .add(target),
    );
    camera.lookAt(target);
    invalidate();
  }

  /** Fits the canvas to its container while preserving the selected camera. */
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    setView(view);
  }

  /** Stops hidden rendering and resumes at a stable neutral pose. */
  function visibilityChanged() {
    cancelAnimationFrame(request);
    request = 0;
    previous = 0;
    if (mixer) {
      mixer.stopAllAction();
      queue.clear();
      action = undefined;
      outgoing = undefined;
      play("neutral");
      mixer.update(0);
    }
    if (!document.hidden) invalidate();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  document.addEventListener("visibilitychange", visibilityChanged);
  setView("hero");
  resize();

  void new GLTFLoader()
    .loadAsync(puppyUrl)
    .then((gltf) => {
      if (disposed) {
        release(gltf.scene);
        return;
      }
      model = gltf.scene;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          // The original mesh has extremely close facial surfaces: avoid shadow acne on the eyes.
          if (!object.name.includes("body")) object.receiveShadow = false;
        }
      });
      scene.add(model);
      for (const clip of gltf.animations) clips.set(clip.name, clip);
      mixer = new THREE.AnimationMixer(model);
      mixer.addEventListener("finished", (event) => {
        if (event.action === action && active !== "neutral")
          start(queue.take(active, action.time, true) ?? "neutral");
      });
      onReady([...clips.keys()]);
      play("neutral");
      mixer.update(0);
      invalidate();
    })
    .catch(() => {
      if (!disposed)
        onError(
          "The puppy could not load. Please reload the playground to try again.",
        );
    });

  /** Releases geometry and materials when a loaded scene is discarded. */
  function release(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          material.dispose();
      }
    });
  }

  return {
    play,
    setView,
    /** Adjusts the review speed without changing the authored clip. */
    setSpeed(value) {
      speed = value;
    },
    /** Returns to neutral when motion previews are disabled. */
    setMotionAllowed(allowed) {
      motionAllowed = allowed;
      if (!allowed) play("neutral");
    },
    /** Stops rendering and releases resources when the app unmounts. */
    dispose() {
      disposed = true;
      cancelAnimationFrame(request);
      queue.clear();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      release(scene);
      light.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
