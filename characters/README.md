# Character direction

## Goal and current review gate

Create a reusable, cute companion for the educational web apps, optimised for iPad. This is a more expressive successor to the idea of Captain Whiskers in Times Traveller.

The user has chosen a smooth cartoon puppy with a simple quadrupedal body. Low polygon counts are acceptable; visible faceting and fur are not the goal. Use rounded forms, a large expressive head, floppy ears, clear eyes, chunky paws and a readable tail. Start with a warm tan/cream palette; colours and proportions remain reviewable.

**Current authorised milestone: a neutral standing static mesh and preview renders. Stop for user review before rigging, animation or app integration.** All four paws should rest on the ground, the face should be relaxed and the silhouette should read at small sizes. Do not treat this first sculpt as final deformation topology.

User-supplied visual references:

- Head: https://blendswap.com/blend/13461
- Simple quadrupedal body: https://blendswap.com/blend/14275

These are direction references, not instructions to import or redistribute their assets. Create original geometry. If reference assets are ever reused, verify their licences and record attribution first. The body page lists CC-BY. The head page could not be retrieved during initial research, but the user subsequently supplied `DOG_MODEL_V2.1.blend`. It contains a complete older character, with an embedded creator credit to Joel Sullivan. It was opened with script auto-execution disabled and inspected as a shape reference; no geometry, rig or textures were copied into this puppy.

The user specifically requested that the head geometry move closer to that reference while retaining the first puppy's materials. The current revision has a taller rounded rectangular skull, fuller cheeks and nose bridge, a longer broad muzzle, and eyes enclosed by integrated facial surrounds. The user subsequently identified exposed eyeball backs and floating brows; those were corrected by building the face around the eyes and projecting the brows onto the forehead. The user then requested higher, more curved brows and substantially more embedded depth. The current arches are solid volumes with about three-quarters of their depth buried, and their visible face interiors are checked for head intersections. During rigging, motion across the curved forehead should follow its surface; arbitrary translations are not guaranteed clear. The tail now tapers continuously without a separate end sphere. Keep the established tan, cream, toffee and dark-eye materials. The user offered the uploaded head and its rig as a fallback if these fixes proved difficult; the original mesh was fixed successfully, so that fallback was not used. This is still awaiting static-design approval.

## Intended production path after approval

Author the model and animations in Blender; retain an editable `.blend` and reproducible Python source. Export glTF/GLB for live rendering, initially considering Three.js. Use simple export-compatible materials and smooth shading, without dense hair, expensive transparency or complex live simulation. Keep preview lighting and scenery separate from the exported character.

After the static design is approved, prepare deformation topology and a skeleton for body, legs, head, ears and tail. Add a small set of facial morph targets if appropriate. Bake Blender-specific rig controls into exportable animation curves. Build a clip library and a small event-driven controller with blending, priorities, safe interruption points and returns to idle.

Desired later behaviours:

- Quiet gameplay: breathing, blinking, looking around, occasional ear twitch or scratch.
- Minor success: happy tail wag, play bow or little happy jump.
- Major success: tail chase, backflip or ears standing tall in happy surprise, supported by an excited face and body movement.
- Failure: a brief sympathetic ear/head droop, then encouragement and recovery.

A gentle smile is the default during quiet gameplay and success. Failure reactions briefly soften it before returning to a reassuring smile; a smile or small nod alone is not a success reaction.

See [the animation proposals](ANIMATION-PROPOSALS.md) for short movements in each category, approximate timings, body-part motion and the rig capabilities to evaluate before implementation.

Layer compatible movements; full-body actions need protected sections (for example, land a backflip before switching). Vary ambient timing and avoid distracting the student. Respect reduced motion and suspend unnecessary rendering when hidden.

## Validation and future decisions

Compare actual appearance and sustained performance at the intended display size on the oldest supported iPad; those device and size requirements are still unspecified. A small polygon count alone is not a performance guarantee: pixel resolution, materials, draw calls, shadows and texture memory also matter.

Keep the same Blender source usable for pre-rendered exports if required, but live 3D is the chosen first path. See [the trade-off analysis](TRADEOFFS.md). Do not build the full animation library until the static puppy and then a small animation prototype have been reviewed.

Blender 4.3.2 was verified in this cloud environment with background Python execution and the glTF exporter available. No interactive desktop is needed for scripted authoring and preview rendering.
