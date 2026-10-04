# Moth

A guided, touch-friendly woodland canvas for exploring camouflage, inheritance and population change with children around 10. Five chapters work in sequence or independently, with instructor notes and no locked activities, scores or timers. The teaching design is in [MOTH.md](../../MOTH.md).

## Run and build

From the repository root:

```sh
just dev moth
just ci
just build
```

The single shared dependency tree supplies Vite, React and TypeScript. The production app is built at `dist/moth/`, works beneath arbitrary static-server subpaths, and can be installed as an offline-capable PWA. All fonts, imagery and code are local. The app has no server, analytics, accounts, API keys or remote data.

## Chapters

1. **Hidden in plain sight:** find eight moths, change bark and explore daylight. Lighting affects the whole scene while controls and reveal markers retain their contrast. The scene illustrates visibility, not a calibrated model of bird vision.
2. **Hidden instructions:** always-visible gene-copy pairs, tap-to-reveal appearance predictions and selected-parent controls. Editing either copy hides that moth again. One dark copy produces dark appearance; only two light copies produce light appearance.
3. **Meet the offspring:** walk through the four ordered copy combinations, manually construct possible offspring, or let independent chance produce up to 20 broods of four. Stepwise conception shows the same copies later recorded in the offspring. Guided and manual examples do not enter the chance tally. Copies visibly travel from the highlighted parent to the offspring.
4. **A changing woodland:** inspect reproduction and survival, follow actual families, and compare identical founding populations on different backgrounds. Hidden gene-copy overlays distinguish appearance from inheritance.
5. **Small changes, many generations:** explore a fictional 32-gene trait, accelerate through unlimited generations, compare starting and current populations, and trace recorded parents, siblings and ancestors.

The many-gene model uses only existing variation. There is no mutation, speciation, migration, extinction or individual recolouring. The model does not promise an all-white-to-all-black journey. Fixed survivor counts are a teaching simplification, not measured predation rates.

## Controls and saved progress

- Every chapter can be opened directly using `#chapter=1` through `#chapter=5`.
- Returning to a chapter preserves its experiment, paused. Leaving a partly explained birth or population cycle completes that already computed event without running additional generations.
- **Step by step** exposes the cycle; **Next generation** completes one cycle. Speed changes presentation only.
- **Replay** plays recorded history, retaining original outcomes and backgrounds. **Repeat with fresh chance** clears descendants after confirmation, retains founders and draws new outcomes.
- History inspection never branches or edits the experiment. Changing the bark or starting live playback returns to the latest generation.
- Parent edits in chapter 3, brood resets and chapter resets confirm discarded work. Choosing new parents in chapter 2 automatically starts a fresh family on the next visit to chapter 3, via any route. Playback speeds survive resets.
- Versioned progress is stored privately in IndexedDB. Storage errors leave the lesson usable in memory. The app does not request personal information.
- Motion follows both the app toggle and the system reduced-motion setting. Hidden tabs pause playback. A short synthesised tone marks each completed generation: low for dark populations, high for light. The header mute button silences it immediately; its setting is saved. Audio is unlocked only by a user gesture.

Chapter 4 animates tree expansion, offspring growth, 48 birds and survivor rearrangement. Moth outlines aid inspection outside the camouflage interval. Chapter 5 uses 100 / 50 / 25 ms generation intervals (Slow / Medium / Fast), subject to device performance. Bark changes do not pause playback. It retains founders plus the latest 256 generations, with a labelled gap in the graph and an explicit boundary in ancestry inspection; chapter 4 keeps its 200-generation limit.

## Implementation

- `src/model.ts`: pure deterministic inheritance, independent random streams, weighted selection and recorded ancestry.
- `src/session.ts`: chapter state, brood generation, navigation and saved-state validation.
- `src/storage.ts`: atomic IndexedDB persistence, kept separate from simulation.
- `src/Discover.tsx`, `src/Offspring.tsx`, `src/Population.tsx`: interactive canvases.
- `src/Moth.tsx`, `src/specimen.ts`, `src/moth.css`: copied and isolated from Moth Studio; detailed specimens are used only in close-ups.
- `src/ui.tsx`: lightweight population moths, bark artwork and shared controls. Population rendering does not create hundreds of detailed SVG flecks per moth.

Every generation retains 96 offspring and the IDs of 48 survivors. Two distinct surviving parents contribute one copy each at every locus. Survival uses positive camouflage weights and weighted sampling without replacement; chapter 4 also divides each weight by `(0.1 + appearanceFrequency)^2` as an explicit search-image teaching heuristic. This makes loss of all variation unlikely without enforcing quotas. No gene version is protected against loss or reintroduced. Cosmetic and layout draws cannot change biological outcomes.

## Verification

The root CI includes the app's formatting, lint, TypeScript checks, model tests, production build and generated PWA precache verification. Model tests cover all single-gene crosses, independent broods, actual parentage at every locus, loss of variation, queued environment changes, playback reproducibility, bounded rolling histories and runs past 600 generations, malformed saved data and direct chapter navigation. Fixed ensembles of 100 seeds check selection direction and gradual many-gene change without requiring every random run to follow the same path.

Browser verification and remaining physical-device/teaching checks are recorded in [tests/QA.md](tests/QA.md).
