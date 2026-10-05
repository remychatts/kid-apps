# Character direction

## Goal and current review gate

Create a reusable, cute companion for the educational web apps, optimised for iPad. This is a more expressive successor to the idea of Captain Whiskers in Times Traveller.

The user has chosen a smooth cartoon puppy with a simple quadrupedal body. Low polygon counts are acceptable; visible faceting and fur are not the goal. Use rounded forms, a large expressive head, floppy ears, clear eyes, chunky paws and a readable tail. Start with a warm tan/cream palette; colours and proportions remain reviewable.

**Current authorised milestone: a neutral standing static mesh and preview renders. Stop for user review before rigging, animation or app integration.** All four paws should rest on the ground, the face should be relaxed and the silhouette should read at small sizes. Do not treat this first sculpt as final deformation topology.

User-supplied visual references:

- Head: https://blendswap.com/blend/13461
- Simple quadrupedal body: https://blendswap.com/blend/14275

These are direction references, not instructions to import or redistribute their assets. Create original geometry. If reference assets are ever reused, verify their licences and record attribution first. The body page lists CC-BY; the head page could not be retrieved during initial research.

## Intended production path after approval

Author the model and animations in Blender; retain an editable `.blend` and reproducible Python source. Export glTF/GLB for live rendering, initially considering Three.js. Use simple export-compatible materials and smooth shading, without dense hair, expensive transparency or complex live simulation. Keep preview lighting and scenery separate from the exported character.

After the static design is approved, prepare deformation topology and a skeleton for body, legs, head, ears and tail. Add a small set of facial morph targets if appropriate. Bake Blender-specific rig controls into exportable animation curves. Build a clip library and a small event-driven controller with blending, priorities, safe interruption points and returns to idle.

Desired later behaviours:

- Quiet gameplay: breathing, blinking, looking around, occasional ear twitch or scratch.
- Success: small happy reactions; tail chase or backflip for larger celebrations.
- Failure: a brief sympathetic ear/head droop, then encouragement and recovery.

Layer compatible movements; full-body actions need protected sections (for example, land a backflip before switching). Vary ambient timing and avoid distracting the student. Respect reduced motion and suspend unnecessary rendering when hidden.

## Validation and future decisions

Compare actual appearance and sustained performance at the intended display size on the oldest supported iPad; those device and size requirements are still unspecified. A small polygon count alone is not a performance guarantee: pixel resolution, materials, draw calls, shadows and texture memory also matter.

Keep the same Blender source usable for pre-rendered exports if required, but live 3D is the chosen first path. See [the trade-off analysis](TRADEOFFS.md). Do not build the full animation library until the static puppy and then a small animation prototype have been reviewed.

Blender 4.3.2 was verified in this cloud environment with background Python execution and the glTF exporter available. No interactive desktop is needed for scripted authoring and preview rendering.
