# Kitten: revised neutral design draft

An original ginger-and-cream kitten modelled in Blender from the user's
image reference. The seated silhouette, oversized head, recessed peach ears,
large blue eyes, gentle smile, whiskers, cream paws and curled tail are intended
to sit alongside the puppy's soft cartoon style.

The revised tail emerges from the centre of the torso at X=0 before curling to
the side. Eyes follow the curved facial surface with shallow domes and eyelids
sculpted into the head, replacing the projecting eye caps and separate backing
spheres. The smile follows the muzzle surface with more visibly lifted corners.
The orange surfaces now have a darker ginger palette, soft directional grain and
restrained tabby variation.

The preserved base model is a **static design draft**. The [rigged animation
library](library/README.md) adds an editable skeleton and the puppy’s complete
set of 18 named clips, adapted to the kitten’s seated proportions. Both are
selectable in Puppy Playground.

- `kitten.blend`: editable geometry, packed coat textures, named facial pieces
  and a separate studio collection.
- `kitten.glb`: character-only static export; no floor, camera or lights.
- `preview-front.png`, `preview-hero.png`, `preview-side.png`, `preview-rear.png`:
  actual Blender renders of this model.
- `create_kitten.py`: reproducible authoring, export and rendering source.
- `coat_material.py`: original fur-grain shader and portable texture baking.
- `textures/`: editable 2048 × 2048 base-colour and normal maps.
- `TEXTURE-NOTES.md`: material details, external texture search and provenance.
- `mesh-stats.json`: generated geometry counts and review status.
- `validate_kitten.py`, `validation.json`: reproducible geometry and export checks.

All geometry is authored here. No reference-image texture, external mesh or
puppy geometry is embedded. Colours use opaque Principled materials and two
baked coat maps, without hair simulation. The texture search and locally authored material are documented in
[the texture notes](TEXTURE-NOTES.md). Coordinates match the
puppy source: forward is Blender -Y, up is Z, and the paw soles lie on Z=0.

Rebuild with Blender 4.3.2 from the repository root:

```sh
blender --background --factory-startup --threads 6 --python characters/kitten/create_kitten.py
```

For a quick review without replacing the saved assets, append
`-- --views front hero --resolution 640 --samples 32 --output-dir /tmp/kitten-review`.
Add `--no-texture` for geometry-only previews. The script overwrites generated
files in its output directory; the full rebuild also regenerates the coat maps.
CPU Cycles is used without a denoiser to support the installed Blender build.

The head, torso and muzzle use sculpt-style union geometry. Facial parts, ears,
paws and tail remain separately editable. Retopology, deformation testing,
material/draw-call optimisation and iPad performance checks are later work;
this is a design draft, not a production animation asset.

The draft has approximately 157,000 triangles, 44 mesh objects and 11 materials.
Two 2K texture maps are embedded in the GLB and packed into the Blender file.
Validation confirms all four paw soles are on the ground, the ear shells and
tail are closed with outward orientation, and all tail-root vertices sit inside
the torso with their centre on X=0. Both eye perimeters follow the head surface,
with approximately 0.003 units of clearance and a maximum central bulge of
0.078 units. A fresh GLB import preserves all 44 meshes and both textures and
contains no studio objects, armature or animations. Re-run with:

```sh
blender --background --disable-autoexec --threads 2 --python characters/kitten/validate_kitten.py
```
