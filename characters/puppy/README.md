# Puppy: static design review

An original tan-and-cream cartoon puppy with a smooth rounded body, large head, floppy toffee-coloured ears and four planted paws. The head follows the uploaded reference’s geometry more closely while retaining the original materials: a taller, less spherical skull, sculpted cheeks and nose bridge, a longer broad cream muzzle, and eyes embedded in integrated facial surrounds. The floating eyelid rings have been removed; brows form higher tapered arches and conform to the actual forehead surface. The tail is a single closed mesh which tapers continuously to its tip, without an end sphere. Proportions and expression remain open for review.

**Stop here for user review. No skeleton, skin weights, morph targets or animation have been created.** The continuous body is a simplified sculpt-style mesh; it will need deformation-aware topology before rigging. Facial pieces and ears remain separate editable meshes.

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

The revised mesh has approximately 26,900 triangles, 16 mesh objects and six simple opaque materials, with no image textures. The GLB is approximately 543 KiB. These are review-stage counts, not measured iPad performance or a final optimisation budget. Material batching and smaller facial meshes can be considered after design approval.

Blender coordinates: forward is -Y, up is Z, the sole plane is Z=0. GLB export performs Blender's usual glTF axis conversion. All geometry is created by the script; no BlendSwap mesh or texture has been incorporated.

The user supplied `DOG_MODEL_V2.1.blend` as a head reference. The revised shapes are authored by this script; the uploaded mesh, textures and older rig were not imported into the deliverable. The torso, legs and paws use the original construction; the tail has been rebuilt.

Review the eye enclosure from oblique angles, brow attachment and tapered tail before investing in animation. The first proposal remains available in Git commit `22d1bb1`.

For a faster preview without overwriting the review files, append `-- --views hero side --resolution 640 --samples 24 --output-dir /tmp/puppy-preview` to the Blender command. The default command renders all five views.

Validation: the GLB was imported into a fresh Blender scene successfully, with 16 mesh objects, no armature or animation actions, and a lowest point at Z=0. Its glTF data includes surface normals, six opaque materials, no textures and no studio camera. Repository formatting, lint, typechecking, all 48 tests, app builds and output verification passed using `npm run ci` (the command behind `just ci`; `just` is unavailable in this environment). Device performance is not yet tested.

Geometry regression checks: all 786 rear-half eye vertices must lie between the front and rear head surfaces; brows must follow the forehead with their back surfaces embedded; the tail must be closed and have no separate tip sphere. Run `blender --background --disable-autoexec characters/puppy/puppy.blend --python characters/puppy/validate_puppy.py`. These checks cover the static pose, not future rig deformation.
