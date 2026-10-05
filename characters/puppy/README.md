# Puppy: static design review

An original tan-and-cream cartoon puppy with a smooth rounded body, large head, floppy toffee-coloured ears and four planted paws. This is the first visual proposal; proportions, expression and colours are open for review.

**Stop here for user review. No skeleton, skin weights, morph targets or animation have been created.** The continuous body is a simplified sculpt-style mesh; it will need deformation-aware topology before rigging. Facial pieces and ears remain separate editable meshes.

## Files

- `puppy.blend`: editable character and a separate studio floor, lights and camera.
- `puppy.glb`: static character only, without studio objects or animation.
- `preview-hero.png`, `preview-front.png`, `preview-side.png`, `preview-rear.png`: actual Blender renders of the exported design, not generated concept art.
- `create_puppy.py`: reproducible Blender authoring and rendering script.
- `mesh-stats.json`: generated geometry counts and review status.

Run from the repository root with Blender 4.3.2:

```sh
blender --background --factory-startup --threads 6 --python characters/puppy/create_puppy.py
```

The script overwrites the generated files beside itself. Blender may also create a `.blend1` backup, which is ignored here. Rendering uses CPU Cycles without a denoiser because the installed Blender build does not include OpenImageDenoise.

The first mesh has approximately 19,600 triangles, 20 mesh objects and six simple opaque materials, with no image textures. The GLB is approximately 414 KiB. These are review-stage counts, not measured iPad performance or a final optimisation budget. Material batching and smaller facial meshes can be considered after design approval.

Blender coordinates: forward is -Y, up is Z, the sole plane is Z=0. GLB export performs Blender's usual glTF axis conversion. All geometry is created by the script; no BlendSwap mesh or texture has been incorporated.

Review the head/body balance, muzzle and eyes, ear shape, leg length, tail and overall silhouette before investing in animation.

Validation: the GLB was imported into a fresh Blender scene successfully, with 20 mesh objects, no armature or animation actions, and a lowest point at Z=0. Its glTF data includes surface normals, six opaque materials, no textures and no studio camera. Repository formatting, lint, typechecking, all 48 tests, app builds and output verification passed using `npm run ci` (the command behind `just ci`; `just` is unavailable in this environment). Device performance is not yet tested.
