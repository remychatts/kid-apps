# Character delivery trade-offs

## Decision

Use Blender to author an original smooth, non-furry cartoon puppy and deliver it as live 3D with a skeleton, a modest set of facial morph targets and pre-authored clips. The user accepted this direction after considering the alternatives below. Blender is the authoring tool; live 3D versus pre-rendered media is a separate delivery choice.

The immediate task is only a static neutral-stance mesh for review. Rigging, animations and integration follow explicit design approval.

## Alternatives considered

| Approach                                     | Advantages                                                                                                                    | Costs and limitations                                                                                                                  | Decision                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Live skeletal 3D plus morph targets          | Pose blending; independent gaze and expression; adjustable colours, lights, camera and accessories; compact reuse of geometry | Needs mobile optimisation; complex fur costly; Blender materials and controls do not all export directly                               | Chosen: well suited to a simple cartoon puppy        |
| Transparent pre-rendered video               | Elaborate fur and lighting baked in; good video compression                                                                   | Clip switches and interruptions can stall or jump; crossfades can double the character; fixed lighting/view; alpha codec compatibility | Reserve for cases where rendering fidelity dominates |
| Transparent image sequences / sprite atlases | Precise frame control; reliable alpha; high offline render quality                                                            | Decoded memory and download grow with frames, resolution and angles                                                                    | Possible fallback for a small bounded library        |
| 2D/2.5D Rive or Spine rig                    | Reusable artwork, blending and event-driven expressions                                                                       | Full rotations and backflips require convincing 2D art; no true 3D relighting                                                          | Good alternative if the visual brief changes         |
| Vertex caches / vertex animation textures    | Replay complex mesh deformation with a live 3D view                                                                           | Texture-memory cost, custom playback and less flexible interaction                                                                     | Specialist supplement, unnecessary for this puppy    |
| Live character plus pre-rendered effects     | Flexible everyday behaviour with elaborate celebration effects                                                                | Must match visual styles and manage both systems                                                                                       | Possible later extension                             |

Transparent video can composite over dynamic backgrounds, including HEVC with alpha in Safari. Its lighting and viewpoint remain baked. Muted inline playback avoids ordinary player controls, but playback failures, preload readiness, alpha support and transitions still require device testing. Removing controls is not the hard part.

Sprite compression does not remove decoded memory costs: 60 uncompressed RGBA frames at 512 × 512 require approximately 60 MiB before other overhead. Cropping, packing and selective loading help.

Morph targets are reusable shape changes (such as eyelid closure), not necessarily full per-frame geometry caches. Bones plus a few facial targets are the appropriate starting point here.

## Behaviour architecture

Use an animation controller rather than simply playing a playlist. Separate quiet idle, attention, occasional ambient actions, feedback and major celebrations. Define body-part ownership, entry/exit poses, safe interruption times and recovery. Pose interpolation alone does not make every transition physically plausible. A backflip should finish its airborne section and land; blinking can often layer over a head turn.

Prefer supportive failure feedback and restrained ambient movement. Keep sounds/effects attached to named animation events rather than arbitrary timeouts. Test responsiveness when a new student event arrives during another action.

## Prior art and sources

- [Duolingo character animation](https://blog.duolingo.com/world-character-visemes/): independent body/mouth states, idle behaviours and answer reactions controlled through Rive state machines. Behavioural precedent, not a 3D implementation.
- [Three.js skinning and morphing demo](https://threejs.org/examples/webgl_animation_skinning_morph.html): looping states, one-off actions, crossfades and facial morphs.
- [Three.js additive blending demo](https://threejs.org/examples/webgl_animation_skinning_additive_blending.html): layered motion reference.
- [Spine web demos](https://en.esotericsoftware.com/spine-demos): interactive 2D skeletal animation and reusable artwork.
- [Blender glTF exporter](https://docs.blender.org/manual/en/4.3/addons/import_export/scene_gltf2.html): exportable transforms, skinning, shape keys and material constraints.
- [Apple HEVC with alpha](https://developer.apple.com/videos/play/wwdc2019/506/): transparent video for compositing, including Safari.
- [WebKit video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/): muted autoplay, inline playback and playback rejection handling; verify current target devices.
- [PixiJS AnimatedSprite](https://pixijs.download/release/docs/scene.AnimatedSprite.html): sprite animation runtime.
- [SideFX vertex animation textures](https://www.sidefx.com/docs/houdini/nodes/out/labs--vertex_animation_textures-3.1.html): baked deformation, memory and interactivity trade-offs.
- [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): humanoid auto-rigging and motion library are not a general quadruped solution.

## Production implications

Keep one consistent model and editable rig instead of generating unrelated videos for every action. Scripted Blender authoring provides reproducible geometry, animation and exports, but appealing proportions and nuanced acting still require visual iteration. Concept images do not supply production topology or a usable rig.

After static approval, prototype idle/blink, gaze, ear scratch, droop/recovery and backflip before expanding the library. Test on the oldest supported iPad at the intended screen size: appearance, loading, memory, event latency, sustained frame time and resuming from the background. Specific budgets remain to be measured, not assumed.
