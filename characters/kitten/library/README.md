# Kitten rig and animation drafts

The original ginger kitten, textured coat and seated neutral design now have an
editable skeleton, planted-paw IK, three-segment ears and tail, and facial shape
controls. `kitten-rig.blend` contains the rig; `kitten-library.blend` contains the
complete animation timeline. `kitten-library.glb` contains the same 18 named
clips and durations as the puppy, including neutral, quiet moments, small wins,
big celebrations and encouragement. Puppy Playground can display either model.

The shared puppy choreography is retargeted to the kitten's own rest skeleton.
Upright ears and the low curled tail use smaller rotations. The short seated hind
legs are unsuitable for the puppy's ear scratch, so Q6 uses a forepaw cheek
scratch with the same protected playback interval. All clips recover to seated
neutral. These remain animation drafts, with final visual polish and oldest-iPad
performance review outstanding.

The original static model and 2K textures are preserved. The rig rebuilds an
animation-only variant from the same sculpt recipe, with closed forelegs that
overlap the shoulder instead of being fused to the belly and haunches. Each
foreleg follows its own joint chain; the torso carries no foreleg weights. This
prevents the cheek scratch from stretching the belly into a folded sheet.
Gaze controls project the iris, pupil and catchlights onto the stationary eye
white rather than the head. This keeps the trailing edge clear of the raised
eye dome during sideways and vertical glances, including between shape keys.
Regular foreleg rings are retained for bending, and the elbow and shoulder sit
inside the foreleg volumes. The animated web export uses a simplified torso and
freshly baked 768px coat maps, including the newly exposed inner forelegs. No external assets are fetched at runtime. The shared clip splitter
preserves image buffer views as well as geometry and animation data.

Rebuild from the repository root:

```sh
blender --background --disable-autoexec --threads 6 --python-exit-code 1 --python characters/kitten/rig_kitten.py
blender --background --disable-autoexec --threads 6 --python-exit-code 1 --python characters/kitten/validate_library.py
node --test apps/puppy-playground/tests/kitten.test.mjs
```

The validation script checks that the torso and forelegs are closed, measures the
authoring scene and renders review frames. A regression test samples the exported
cheek scratch and rejects upward stretching of the seated belly.
The Node tests use the real Three.js skin, morph and animation parsers, substituting
only browser image decoding; embedded image signatures and buffer ranges are
checked separately. They verify clip parity, neutral recovery, facial controls,
skinned meshes and the offline asset size limit. Gaze regression checks raycast
the exported iris and pupil against both eye whites in all four directions at
neutral, quarter, half, three-quarter and full strength.

`Q3-left-hero.png` and `Q3-right-hero.png` show both sideways glances.
