# Puppy: static design review

An original tan-and-cream cartoon puppy with a smooth rounded body, large head, floppy toffee-coloured ears and four planted paws. The head follows the uploaded reference’s geometry more closely while retaining the original materials: a taller, less spherical skull, sculpted cheeks and nose bridge, a longer broad cream muzzle, and eyes embedded in integrated facial surrounds. The floating eyelid rings have been removed; brows form higher tapered arches with solid depth: 0.30 Blender units buried behind the forehead and 0.09–0.095 in front, rather than thin surface strips. Roughly 76–77% of that depth is embedded. The depth direction is Blender Y; Blender Z is vertical. The tail is a single closed mesh which tapers continuously to its tip, without an end sphere. Proportions and expression remain open for review.

**This directory preserves the static design reference. The subsequently requested [rig prototype](rig/README.md) adds a skeleton, skin weights, morph targets and diagnostic poses in `rig/`.** The continuous body is a simplified sculpt-style mesh; it will need deformation-aware topology before rigging. Facial pieces and ears remain separate editable meshes.

## Files

- `puppy.blend`: editable character and a separate studio floor, lights and camera.
- `puppy.glb`: static character only, without studio objects or animation.
- `preview-hero.png`, `preview-front.png`, `preview-side.png`, `preview-rear.png`, `preview-head.png`: actual Blender renders of the exported design, not generated concept art.
- `create_puppy.py`: reproducible Blender authoring and rendering script.
- `mesh-stats.json`: generated geometry counts and review status.
- `validate_puppy.py`: verifies rear-eye enclosure, brow contact, tail closure and ground placement.

Run from the repository root with Blender 4.3.2:

```sh
blender --background --factory-startup --threads 6 --python characters/puppy/create_puppy.py
```

The script overwrites the generated files beside itself. Blender may also create a `.blend1` backup, which is ignored here. Rendering uses CPU Cycles without a denoiser because the installed Blender build does not include OpenImageDenoise.

The revised mesh has approximately 26,900 triangles, 16 mesh objects and six simple opaque materials, with no image textures. The GLB is approximately 552 KiB. These are review-stage counts, not measured iPad performance or a final optimisation budget. Material batching and smaller facial meshes can be considered after design approval.

Blender coordinates: forward is -Y, up is Z, the sole plane is Z=0. GLB export performs Blender's usual glTF axis conversion. All geometry is created by the script; no BlendSwap mesh or texture has been incorporated.

The user supplied `DOG_MODEL_V2.1.blend` as a head reference. The revised shapes are authored by this script; the uploaded mesh, textures and older rig were not imported into the deliverable. The torso, legs and paws use the original construction; the tail has been rebuilt.

Review the eye enclosure from oblique angles, brow attachment and tapered tail before investing in animation. The first proposal remains available in Git commit `22d1bb1`.

For a faster preview without overwriting the review files, append `-- --views hero side --resolution 640 --samples 24 --output-dir /tmp/puppy-preview` to the Blender command. The default command renders all five views.

Validation: the GLB was imported into a fresh Blender scene successfully, with 16 mesh objects, no armature or animation actions, and a lowest point at Z=0. Its glTF data includes surface normals, six opaque materials, no textures and no studio camera. Repository formatting, lint, typechecking, all 48 tests, app builds and output verification passed using `npm run ci` (the command behind `just ci`; `just` is unavailable in this environment). Device performance is not yet tested.

Geometry regression checks: all 786 rear-half eye vertices must lie between the front and rear head surfaces. Brows must have at least 74% of their local depth buried, with their backs still inside the head. Front-face interiors are sampled as well as vertices, both in neutral and with ±0.01 units of front-to-back travel. The tail must be closed and taper continuously. Run `blender --background --disable-autoexec characters/puppy/puppy.blend --python characters/puppy/validate_puppy.py`.

Rigging note: the depth test is not a guarantee for arbitrary motion across the forehead. Small free X/Z translations can still meet the steeply curved head surface; brow motion across the face should follow the forehead, with the actual rig poses checked for intersections. This static reference remains unrigged; see the separate [rig prototype](rig/README.md) for the surface-following brow controls and deformation checks.
