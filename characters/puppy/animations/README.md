# Quiet animation drafts: Q1–Q4

The existing puppy rig now has the first four quiet gestures from the [proposals](../../ANIMATION-PROPOSALS.md), with a smiling neutral entry and recovery. These are drafts for review, not the larger success/failure library.

| Clip                   | Timing        | Draft behaviour                                                                                                                     |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `neutral`              | 0.2 s, static | Relaxed smile, four paws grounded.                                                                                                  |
| `Q1`                   | 4 s loop      | Two-second inhale and exhale, 1.5% chest morph and a small chest rise.                                                              |
| `Q2`                   | 1.2 s         | Settle 0.2 s, close 0.15 s, hold 0.1 s, open 0.25 s, rest 0.5 s.                                                                    |
| `Q3-left` / `Q3-right` | 2.5 s         | Eyes lead a 16° tilt, the raised-side brow lifts, floppy ears lag and settle.                                                       |
| `Q4`                   | 3.5 s         | Eyes lead a 21° combined neck/head turn and a 6° muzzle lift; turn scans back over 0.8 s, gaze and muzzle settle gently to neutral. |

Left/right mean the puppy's own side. The torso and paws stay facing forward. Each exported clip includes a complete pose, including the baseline smile: play one at a time in this prototype. Channel masking/additive layers for a later gameplay controller remain separate work.

## Files and review

- `puppy-quiet.blend`: editable IK rig and central facial sliders; one named timeline with clip-start markers, opened at neutral frame 1.
- `puppy-quiet.glb`: one shared mesh/skin with six named bone-and-morph clips, including neutral and both Q3 variants. No cameras, lights, images or runtime Blender constraints.
- `clips.json`: names, timings and authoring frame ranges used by the test app.
- `authoring-validation.json`: every authored frame checked for finite body geometry, floor penetration and planted sole drift (186 sole vertices, maximum drift below 0.000001 units).
- `export-validation.json`: fresh GLB import for each clip, checked against the editable source at endpoints, extremes and between-frame samples. Maximum surface-vertex discrepancy is approximately 0.00058 units.
- `*-hero.png`, `*-front.png`, `*-side.png`: baked review poses from three viewpoints.

The [Puppy Playground](../../../apps/puppy-playground/) loads the exported clips directly with Three.js. It begins in neutral, provides clickable gestures, three views and playback speed, and returns one-shot gestures to neutral with a short blend. Q1 loops until another selection. It respects reduced motion, permits explicitly enabling previews, and stops rendering while hidden or resting.

The browser tests load the actual GLB and check clip names/durations, neutral endpoints, closed eyelids, opposite tilts and every exported frame's planted paws. Front, side and three-quarter renders provide visual evidence for the face and ears. Review the motion at the intended size on the oldest supported iPad once that device is specified; device performance and final appeal remain unverified.

## Rebuild and validate

Verified with Blender 5.1.2. From the repository root:

```sh
./characters/puppy/animate_quiet.py --render
./characters/puppy/validate_quiet.py
ruff format characters/puppy/animate_quiet.py characters/puppy/quiet_glb.py characters/puppy/validate_quiet.py
ruff check characters/puppy/animate_quiet.py characters/puppy/quiet_glb.py characters/puppy/validate_quiet.py
npx prettier --write characters/puppy/animations/*.json
just dev puppy-playground
just ci
```

The executable scripts locate Blender on PATH or in the standard macOS application location. They can also run directly through Blender:

```sh
blender --background --disable-autoexec --threads 6 --python-exit-code 1 --python characters/puppy/animate_quiet.py -- --render
blender --background --factory-startup --threads 6 --python-exit-code 1 --python characters/puppy/validate_quiet.py
```

Use `--output-dir /tmp/puppy-quiet` on the builder and `--animation-dir /tmp/puppy-quiet` on the validator to work elsewhere. The builder overwrites generated animation files; preserve manual edits under another filename before rebuilding. The original static model and rig prototype are preserved. The scene exporter bakes IK and facial corrective drivers; the splitter crops curves into local clip times, shares geometry and removes unused timeline buffers. Workbox precaches the content-hashed GLB alongside the app shell.
