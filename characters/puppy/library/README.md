# Complete puppy animation drafts

All movements in the [proposals](../../ANIMATION-PROPOSALS.md) now have editable drafts, building on the original Q1–Q4 samples without changing those assets. The [Puppy Playground](../../../apps/puppy-playground/) starts in neutral and offers every movement by category, three viewpoints and adjustable speed.

| Clips              | Duration     | Movement                                                 |
| ------------------ | ------------ | -------------------------------------------------------- |
| neutral            | 0.2 s static | Relaxed smile, four paws grounded                        |
| Q1                 | 4 s loop     | Soft breathing                                           |
| Q2                 | 1.2 s        | Slow blink                                               |
| Q3-left / Q3-right | 2.5 s        | Curious head tilt                                        |
| Q4                 | 3.5 s        | Look around, then attend                                 |
| Q5-left / Q5-right | 1.3 s        | Ear lift, flick and delayed tip settle                   |
| Q6                 | 4.5 s        | Weight shift, two hind-paw scratches, grounded recovery  |
| MIN1               | 2.4 s        | Tail wag with delayed tip                                |
| MIN2               | 3 s          | Planted play bow and wag                                 |
| MIN3               | 2.5 s        | Crouch, little jump, soft landing                        |
| MAJ1               | 4.5 s        | Full tail-chasing circle with alternating diagonal steps |
| MAJ2               | 3.5 s        | Body-centred airborne backflip and landing               |
| MAJ3               | 3.2 s        | Unfolded tall ears, delighted face, shimmy and wag       |
| F1                 | 2.8 s        | Brief droop, then reassuring smile and sweep             |
| F2                 | 3 s          | Sympathetic tilt, brighten and nod                       |
| F3                 | 3.5 s        | Exhale, blink, lift and encouraging wag                  |

Left/right refer to the puppy. Every clip includes the complete bone/morph pose and returns to the same smiling anchor and facing. Play one clip at a time; additive channel masking remains future gameplay work. The bow keeps a modest chest dip to respect the prototype leg reach, with neck flexion pointing the nose down. Library breathing expands the chest more visibly, and all success clips ease into a deeper smile curve. Complex scratch, chase and flip remain drafts for appeal and deformation review.

## Assets and reproduction

- `puppy-library.blend`: editable rig, facial controls and a single marked timeline. Dense linear keys at 60 fps align the source with portable animation sampling.
- `puppy-library.glb`: shared geometry and skin, 18 named clips, no preview scenery or Blender-only runtime dependencies.
- `clips.json`: durations, timeline ranges, stage bounds and protected sections.
- `authoring-validation.json`: every authored frame checked for finite geometry, reachable IK, planted sole drift and airborne floor clearance.
- `export-validation.json`: fresh import per clip, comparing actual mesh deformation with the source at endpoints, representative poses and between-key times.
- PNG previews: representative new poses; full-body movements include front, side and three-quarter views. Original Q1–Q4 renders remain in `../animations/`.

From the repository root, with Blender 5.1.2:

```sh
./characters/puppy/animate_library.py --render
./characters/puppy/validate_quiet.py --animation-dir characters/puppy/library --asset-name puppy-library
ruff format characters/puppy/animate_library.py characters/puppy/validate_quiet.py
ruff check characters/puppy/animate_library.py characters/puppy/validate_quiet.py
just dev puppy-playground
just ci
```

The executable scripts find Blender on PATH or in its standard macOS location; the user's open Blender session is untouched. Use `--output-dir /tmp/puppy-library` on the author and the matching `--animation-dir` on the validator for a separate build. Generated assets are overwritten; preserve manual edits elsewhere before rebuilding.

The little jump and backflip use parabolic flight with approximately 14 rig units/s² of downward acceleration, maintaining gravity through touchdown. Airtime is 0.4 s and 0.85 s respectively; the tuck and flip follow that flight timing, with smooth limb extension and grounded landing compression.

## Playback and remaining review

The app retains only the latest pending request while scratching (0.8–3.6 s), jumping (0.5–1.6 s), chasing (0.9–4 s) or flipping (0.6–2.2 s). It fades over 0.25 s once support returns, and smoothly frames taller animations to include the ears and airborne arc. The optional Rotate control adds one complete orbit per clip (or breathing loop), preserving continuous framing through transitions. These windows are in clip time and follow the selected review speed. Hidden pages discard pending actions and resume in neutral. Reduced motion starts with motion previews disabled; users can explicitly enable them for review.

Three.js tests measure the real exported clips: neutral endpoints, planted contacts, jump/flip clearance, chase stance stability, expressive motion and smile recovery. Playback policy tests cover deferred/latest requests. Workbox precaches the hashed GLB and application shell. Final appeal, sustained performance on the oldest supported iPad, gameplay scheduling and expression-only reduced-motion feedback remain future work.
