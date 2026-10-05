# Puppy rig prototype

An editable Blender rig and a baked GLB for the capabilities in [the animation proposals](../../ANIMATION-PROPOSALS.md). The reviewed tan/cream puppy remains the visual basis. The original static files one directory above are preserved.

This is a **rig and pose-validation milestone**. `RIG_DIAGNOSTICS` is a sequence of capability probes with neutral poses between them, not a set of finished gameplay clips. App integration, animation choreography and iPad performance testing are still separate work.

## Deliverables

- `puppy-rig.blend`: authoring rig, skin weights, facial morphs, IK constraints, central facial sliders and labelled diagnostic timeline. Studio objects remain separate.
- `puppy-rig.glb`: character only, with one skin, baked bone transforms and morph animation; no runtime Blender constraints, drivers, textures, cameras or lights.
- `rig-stats.json`: generated geometry, control and file-size counts.
- `rig-validation.json`: measured validation results, including the fresh-import GLB comparison.
- `pose-*.png`: Blender renders of the baked diagnostic poses.

Blender coordinates remain forward −Y, up Z and ground Z=0. L/R mean the puppy's own left/right. The GLB uses the normal glTF axis conversion. The diagnostic timeline runs at 30 fps, frames 1–301, with a neutral pose every 30 frames. Open the blend at frame 1 for the smiling standing pose.

## Controls

Select **Puppy rig** and enter Pose Mode for bone controls. Facial sliders are in the rig object's Custom Properties, range 0–1; keyframe them on the rig object. Do not key the driven mesh shape values directly. There are 31 bones, including 26 deform bones, and 19 facial controls.

| Controls                         | Purpose and tested range                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`                           | Whole-character travel, facing, jumping and rotation. Paw targets move with it.                                                                                                                                                                                |
| `pelvis`, `spine`, `chest`       | Independent local body movement and forward/sideways spine bending. Bow probe lowers the chest; crouch lowers the pelvis 0.20 units.                                                                                                                           |
| `neck`, `head`                   | Nod, turn and tilt. Face pieces follow the rigid head; the neck blends into the chest. Curious probe tilts 16°.                                                                                                                                                |
| `IK.front.L/R`, `IK.hind.L/R`    | Four independent paw positions and orientations. Two-bone leg IK with no stretching and a bent rest pose; the third deform bone orients each paw. Targets parent to `root`, so torso gestures preserve support. No toe articulation.                           |
| `ear.0/1/2.L/R`                  | Independent root, middle and tip rotations for twitching, unfolding and follow-through. The tall-ear probe unfolds the full chain above the skull; narrow roots are embedded into the head.                                                                    |
| `tail.0/1/2`                     | Base, middle and tip of the continuously tapered tail. Curious probe uses a 25° base wag with differing middle/tip rotations.                                                                                                                                  |
| `Breath`                         | 1.5% local chest expansion with a smooth mask that excludes the paws.                                                                                                                                                                                          |
| `Blink.L/R`, `EyeWide.L/R`       | Independent opaque upper/lower eyelids; Blink=1 fully covers the eyes. Use small blink values for a squint. An automatic midpoint corrective keeps intermediate lids outside the eyeballs. Blink suppresses widening.                                          |
| `GazeLeft/Right/Up/Down.L/R`     | Bounded pupil/highlight motion over each eye surface: 0.032 horizontal / 0.030 vertical units at full weight. The whites remain fixed inside the head. Opposing/diagonal inputs share a normalised weight budget.                                              |
| `BrowRaise.L/R`, `BrowInner.L/R` | Whole-brow lift up to 0.020 units; inner-end lift up to 0.015. A grid of surface-projected morphs follows the curved forehead, including combined expressions. Whole-brow raising suppresses the inner-only lift; buried depth shortens where the skull thins. |
| `MouthRelax`, `SmileBroad`       | Relax the default closed-mouth smile or lift the corners/adjacent muzzle by 0.025 units for delight. Both meshes use the same displacement field; inputs share a normalised budget. No jaw, teeth, tongue or speech controls.                                  |

The body has been resampled from the static decimated sculpt into a relaxed quad surface and projected back to the reviewed silhouette. Weight masks separate the neck from the rump, blend limb roots and keep sole vertices rigid to their paw bones. Every vertex has normalised weights and at most four influences. Linear skinning matches the GLB runtime; Blender-only volume-preserving skinning is disabled. This is an automatically resampled prototype surface, not hand-retopologised production joint loops.

The generated asset has 20,289 vertices and 40,066 triangles across 22 meshes. The baked GLB is approximately 2.43 MiB. The current validation measures less than 0.000001 units of planted sole drift and a maximum GLB round-trip vertex error of about 0.000132 units. The scratch paw comes within 0.010 units of the ear. Across the sampled brow range, at least 62% of each brow's depth remains buried, with at least 0.046 units of front clearance; the neutral brow retains approximately three-quarters buried depth. These are prototype measurements, not a final device budget or all-pose guarantee.

## Proposal coverage and limits

| Proposals          | Rig evidence / remaining work                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1–Q5, MIN1, F1–F3 | Breathing, full/partial blink, bounded gaze, head tilt, asymmetric brows, ear articulation, wag and relaxed-to-smiling mouth controls. Neutral frames restore the baseline expression. Finished timing and layering remain to author.                                       |
| MIN2–MIN3          | Planted bow and crouch probes; root-lift/tuck probe. Contact validation measures sole movement through planted gestures. Landing follow-through and a finished jump are not authored.                                                                                       |
| MAJ3               | Tall independently unfolded ears, raised brows, wider lids and broader smile. The torso rises 0.055 units with planted targets. The happy shimmy and ear bounce remain to animate.                                                                                          |
| Q6                 | Three supporting paws and an independently raised hind paw are demonstrated. A three-quarter crouch and head turn bring the raised hind paw to the same-side ear. This is a reach pose; scratch strokes, contact response and safe paw-lowering recovery remain to animate. |
| MAJ1               | Root turn, sideways spine/head movement and lifted diagonal paws are demonstrated. A full contact-aware turning gait is not authored or validated.                                                                                                                          |
| MAJ2               | Upside-down root/tuck pose is checked for positive floor clearance, using a deliberately generous 3.6-unit root height. This is a clearance probe, not a finished flip or a validated trajectory/stage allowance.                                                           |

Bone controls intentionally remain free for further posing; the checked poses are not a promise of arbitrary extreme rotations. Long limbs fully extended, sharp joint folds and large combined body rotations still need animator judgement and further deformation work. Facial control bounds apply in Blender; a runtime driving morph weights directly must preserve the same normalisation and corrective rules, or play the baked curves.

## Rebuild, validate and export

Run from the repository root with Blender 4.3.2:

```sh
blender --background --factory-startup --threads 6 --python-exit-code 1 --python characters/puppy/rig_puppy.py -- --render
blender --background --factory-startup --threads 6 --python-exit-code 1 --python characters/puppy/validate_rig.py
npx prettier --write characters/puppy/rig/*.json
```

The builder reads the static `puppy.blend` and overwrites generated files in this `rig/` directory. Use `--output-dir /tmp/puppy-rig` to build elsewhere and `--rig-dir /tmp/puppy-rig` on the validator. Preserve manual authoring edits under a different filename before rebuilding.

To export an edited authoring blend, set its frame range and active action, save it, then run:

```sh
blender --background --disable-autoexec characters/puppy/rig/puppy-rig.blend --threads 6 --python-exit-code 1 --python characters/puppy/export_rig.py -- --output /tmp/puppy-rig.glb
```

The exporter samples all evaluated bones and facial values before removing constraints/drivers in memory. It keys the solved values every frame and exports one scene animation. It does not overwrite the editable blend. This preserves the control rig for later animation and makes playback independent of Blender.

The validator checks skin influence counts/sums, quad coverage, planted sole positions and IK reach, forehead depth and brow front-face centres at 25 slider combinations per side, intermediate and closed eyelids, tall-ear root attachment, airborne clearance and glTF structure. It imports the GLB into a fresh scene and compares deformed vertices against the authoring rig at 13 frames, including an in-between pose. Visual review and numerical checks complement each other; they do not establish all-pose collision freedom or device performance. The oldest supported iPad and intended display size are still unspecified.
