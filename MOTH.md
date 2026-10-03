# Moth: app specification

## Purpose and scope

Moth is an interactive teaching canvas for children around 10 years old, guided by an adult. It makes inheritance and natural selection visible at the level of individual moths, then connects those events across generations. The first guided visit occupies roughly 36 minutes of a 30–45 minute lesson; the instructor can shorten experiments or leave time for discussion outside the app.

Five chapters lead on sequentially, but every chapter is immediately available from persistent navigation. There are no locked levels, compulsory quizzes, scores, timers or completion requirements. Children and instructors can pause, inspect, predict, repeat and compare at their own pace.

This document specifies the first version; it does not implement the app. The working title and app ID are **Moth** and `moth`. Implementation will live in `apps/moth/`.

### Learning outcomes

A child should be able to explain that:

1. Visibility depends on a moth's appearance, surroundings and available light.
2. Appearance does not reveal every inherited gene version a moth carries.
3. Each offspring receives one copy of a modelled gene from each parent; siblings can receive different combinations.
4. Chance affects individual outcomes. Better camouflage helps survival but does not guarantee it.
5. Survivors become parents, so inherited variants associated with better survival can become more common.
6. Repeating these processes can produce large differences between distant generations, although nearby generations overlap and offspring usually resemble their parents.
7. This model can only draw on the variation already available; change is neither planned nor guaranteed to continue indefinitely.

### Exclusions

- Mutation, speciation, reproductive isolation and migration.
- A human-evolution chapter or in-app answer to the “first human” question. The ancestry canvas can support subsequent instructor discussion, but does not simulate human evolution.
- Extinction, changing population size, resource competition and population-management challenges.
- Detailed meiosis, chromosomes, linkage, crossover, sex determination and realistic fecundity.
- Calibrated bird vision, predation rates, historical dates or time to adaptation.
- Accounts, multiplayer, servers, API calls, analytics and remote assets.

## Experience and presentation

### Chapter sequence

| Chapter                            | Approximate lesson time | Main question                                    | Main interaction                                                |
| ---------------------------------- | ----------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1. Hidden in plain sight           | 0–3 minutes             | Which moths are easiest to spot?                 | Explore bark and daylight; find and reveal moths.               |
| 2. Hidden instructions             | 3–10 minutes            | Can two dark moths carry different instructions? | Reveal and change gene copies; compare appearances.             |
| 3. Meet the offspring              | 10–17 minutes           | Can two dark parents have a light baby?          | Assemble an offspring, then generate independent chance broods. |
| 4. A changing woodland             | 17–28 minutes           | Why does the population change?                  | Follow reproduction and survival; compare woodland runs.        |
| 5. Small changes, many generations | 28–36 minutes           | How different can distant descendants become?    | Accelerate a many-gene model and inspect actual ancestry.       |

Timings are instructor guidance, never countdowns. Each chapter has a compact adult note containing its question, a suggested experiment, a misconception to listen for and the relevant simplification. Child-facing text is short and attached to the current action. Controls must be understandable without reading this specification.

### Layout and visual identity

- Optimise for landscape iPad, including a 1024 × 768 CSS-pixel viewport. The canvas takes most of the screen; controls and drawers must not cover the current interaction.
- Use a woodland setting, legible rounded type and friendly moths. Calm animation makes specimens feel alive without competing with explanations.
- Keep chapter navigation at the top, contextual controls beside the canvas, and Previous/Next chapter actions in consistent positions.
- At narrow widths, stack controls and allow normal scrolling. No core action depends on hover, precise dragging or a desktop pointer.
- Preserve each individual's identity through a stable ID/name and cosmetic seed, including in history.
- Use expressive, detailed moths for family close-ups. Population views use a simpler renderer preserving colour and identity without hundreds of SVG flecks per specimen.
- During chapter 1's search, suppress bright faces, motion, outlines and drop shadows that would reveal camouflaged moths. Personality returns in inspection views.
- Predation is brief and non-gruesome: a bird swoops and a moth disappears. Say “eaten” or “did not survive”, rather than implying it flew elsewhere. No death score or celebratory effects.

### Navigation and saved state

- Show all five numbered chapter names, directly accessible in one action on the target layout. A compact menu is acceptable on small screens.
- Previous/Next is always available, even during unfinished activities. Every chapter has a complete default state and short orientation for direct visits.
- Navigating away pauses playback and saves the chapter. Returning restores its scene, paused.
- During an animation, chapter navigation finishes the already computed event without further simulation, saves it, then navigates. Never save half-created offspring or count a generation twice.
- On first sequential entry to chapter 3, carry over the parent copies selected in chapter 2. Existing chapter 3 work is preserved on subsequent visits; an explicit “Use these parents” action can replace it.
- Chapters 4 and 5 start their own populations. Introduce them as new experiments; do not silently expand one family into unrelated moths or turn binary moths into many-gene moths.
- “Reset chapter” restores its documented preset and controls. Confirm if it discards broods or population history. Ordinary navigation never clears work.
- Use hash-based links, for example `#chapter=4`, compatible with arbitrary static-server subpaths. Links select a chapter, not a remotely shared simulation.
- Save a versioned local session at completed actions, including settings, seeds, individuals, parent links, event history and selected chapter. Nothing leaves the device.
- Use IndexedDB for population records and history, with atomic saves at completed boundaries. Keep large histories out of synchronous localStorage; handle quota failures as storage unavailability.
- If storage is unavailable, continue in memory with a quiet notice. Reject corrupt/incompatible saved sessions safely and offer a fresh start.

## Chapter 1: Hidden in plain sight

### Scene and actions

Start with eight resting moths, four light and four dark, on textured light bark in bright daylight. Positions are seeded, non-overlapping and clear of controls. No labels, gene circles or motion identify their positions before discovery.

The child can:

- Tap a moth to mark it as found, with a marker outside its wings. Finding it does not remove it or simulate death.
- Switch **Bark** between Light and Dark without moving or changing the moths.
- Adjust **Daylight** continuously from “Dim — dawn / dusk” to “Bright — daytime”.
- Choose **Reveal moths** to outline all specimens and enable inspection; **Hide outlines** resumes exploring the same scene.
- Choose **New hiding places** to change positions and clear found markers, preserving the mixture, bark and daylight.
- Choose **Clear markers** to look again at exactly the same arrangement.

Display “Found 3 of 8”, without a timer or completion reward. Bark and daylight changes preserve positions and found markers for direct comparison.

Suggested experiment: find obvious moths, reduce daylight, reveal the remaining moths, then compare the same arrangement on the other bark. Ask “Does a moth have to match perfectly to be harder to see?” Do not force an answer or assert every observer experiences the same visibility.

### Daylight rendering contract

Apply daylight to one composite scene containing the bark and complete moth bodies, including eyes and markings. Never tint only the background or only the moths. The control changes display illumination, not stored inherited appearance or bark type.

- Maximum daylight retains normal scene colours.
- Towards dim light, smoothly reduce brightness and saturation and introduce a restrained cool twilight tint. Use a shared luminance/colour treatment; do not simply fade moth opacity into the bark.
- Initial visual tuning range: brightness 100% to approximately 35%; saturation 100% to approximately 55%. Tune on a physical iPad. These are display parameters, not biological measurements.
- Keep the dim endpoint inspectable after reveal; do not include complete darkness.
- Keep text, controls, focus indicators, found markers and reveal outlines outside the treatment at accessible contrast.
- Slider changes must not regenerate texture, move moths, alter inherited appearance or consume simulation randomness.
- Caption: “Changing light can make a resting moth harder to spot. Camouflage can help without being a perfect match.”

Dawn/dusk supplies a recognisable setting, not a claim that these are the main predation periods. Adult notes explain that resting peppered moths are also preyed on during daylight and a screen does not reproduce bird vision. The slider is an observation tool in chapter 1 only; chapters 4–5 use fixed presentation and a separately defined camouflage model.

### Exit idea

“The same moth can be easy to spot in one setting and hard to spot in another.” Continue is available without finding all eight.

## Chapter 2: Hidden instructions

### Scene and actions

Show three large moth cards with the distinct combinations light/light, light/dark and dark/dark. The mixed pair may appear in either order, but is not a fourth biological combination. Each card has two gene-copy circles with parental-origin labels, a moth and an **Appearance** label.

Start with copies hidden: two dark moths look similar despite carrying different combinations. **Look inside** reveals their circles. Introduce:

> “We are looking at one colour gene. Each moth has two copies, one from each parent.”
>
> “In these moths, one dark version is enough for dark wings. Light wings need two light versions.”

The child can change either circle between Light and Dark, swap their order and hide/reveal copies. This is explicitly a **Build a moth** editor. Editing copies replaces the preview with a newly built specimen, rather than animating a living moth adapting to its surroundings.

Use **gene**, **copy**, **version** and **appearance** in child copy. Keep allele, genotype, phenotype, dominant and recessive in optional adult notes. Never call the dark version stronger, better or more likely to be inherited.

An optional prediction hides the built moth until **Show appearance**. Feedback explains its copies without scoring. Two parent slots prepare for chapter 3, defaulting to dark moths each carrying one light copy.

### Exit idea

“A dark moth can carry a light version you cannot see in its wings.” Adult prompt: “Can you tell which dark moth could pass on a light version just by looking?”

## Chapter 3: Meet the offspring

### Scene and inheritance animation

Show Mum and Dad, their gene copies, and a four-offspring brood area. Both default parents are mixed dark/light. Copies can be edited before a brood begins.

For each offspring:

1. Highlight one selected copy in Mum and animate a copy into an egg.
2. Highlight one selected copy in Dad and animate a copy into a sperm.
3. Bring the cells together, retaining both circles in the offspring's pair.
4. Show a compact egg → caterpillar → pupa → moth transition labelled “Later…”, then reveal the moth.

Parents retain both copies throughout. Never imply a copy has been used up. Show one conception at a time, not a finite tray with exactly two cells of each version.

### Construction and chance

**Try a combination** lets the child choose a copy from each parent by tapping or optional dragging. Label the result “A possible offspring”. This construction experiment does not enter the chance-brood tally.

**Let chance choose** independently selects one of each parent's two copies with equal probability for every offspring. **Make one** advances one birth; **Finish brood** generates the remaining births. Results are never balanced across the brood and earlier selections do not affect later probabilities.

After four offspring, **Another brood** keeps the parents and generates four independent births. Show recent broods and cumulative light/dark counts for those parents. Keep up to 20 broods, then invite a fresh tally rather than silently dropping results. Groups of four are illustrative, not the real number of eggs a moth lays.

Changing parent copies starts a new experiment and clears its tally after confirmation; it cannot rewrite offspring. Construction and chance modes have distinct visible labels and may be explored in either order.

### Probability and feedback

Never promise a light offspring in a brood. Two mixed parents give a 1/4 chance of a light offspring per birth, not exactly one light offspring per four siblings. The fraction can appear in adult notes; the main view uses copies and repeated broods.

Suggested experiments:

- Two mixed dark parents: can they produce a light offspring?
- Dark/dark with light/light: why are all offspring dark despite receiving a light copy?
- Light/light with light/light: why are all offspring light in this model?

### Exit idea

“The same parents can produce different offspring. Each receives one copy from each parent.” Next introduces a whole woodland, not a population consisting of one brood.

## Chapter 4: A changing woodland

### Starting population and cycle

Start on Light bark with 48 parents: 12 light/light, 24 mixed and 12 dark/dark. There are 12 light and 36 dark appearances but equal numbers of light and dark gene copies. Main counts show appearances; **Look inside** and a selected-family drawer expose copies.

At generation 0 these are the starting parents. Each new generation follows this cycle:

1. **Parents:** randomly pair 48 parents into 24 distinct pairs.
2. **Offspring:** each pair produces four independent offspring, making 96.
3. **Growing up:** compress the life stages, then show young adults on bark. Previous parents retire to history.
4. **Survival:** birds eat 48 offspring; camouflage biases survival, with chance still involved.
5. **Next parents:** the 48 survivors become the next parents. Update the generation number and history.

For the first generation, expand one family and pause at inheritance and survival. **Continue step** advances a phase; **Next generation** completes one cycle; **Play** repeats at a gentle pace. Pause is always available. **Skip animation** finishes the precomputed event without changing its outcome.

Population experiments assign reproductive roles to pairs without tracking sexes. Adult notes explain this abstraction; sex ratios do not introduce hidden survival rules.

### Environment and comparison

- Choose Light or Dark bark. Changes during a cycle pause playback and queue for the next cycle, explicitly marked; they never rewrite events already under way.
- **Compare woodlands** starts two runs with exactly the same generation-0 individuals on opposite backgrounds. Preserve any existing single run for return.
- Advance both comparison sides by the same generation count, with current appearances and a shared-scale history chart. They share starting conditions and seed, but parent populations and subsequent histories may diverge after selection.
- **Repeat with fresh chance** keeps starting individuals and environment, clears that experiment's descendants after confirmation and uses a new simulation seed. **Replay** retains the seed and recorded outcomes.
- Spoken or optional predictions (“More light”, “More dark”, “Not sure”) never control results or block progress.

Changing bark cannot change inherited colour. Better camouflage does not guarantee survival; poorer camouflage does not guarantee death. No rule protects the last copy of a version. If it disappears, explain that the model no longer has it available: changing bark cannot recreate it.

An optional adult context card explains that pollution changed resting backgrounds and which inherited colours were well hidden. Never imply soot directly recoloured moths or caused a useful version to appear. No historical rates are simulated.

### Exit idea

“Survivors can pass their copies to offspring. Over generations, this changes which appearances are common.” Next explicitly introduces a different, fictional model.

## Chapter 5: Small changes, many generations

### Change of model

Begin with a short, dismissible explanation:

> “The peppered moth example used one colour gene. Now imagine moths whose shade depends on lots of genes. Each offspring still inherits copies from both parents.”

This fictional many-gene trait is rendered using moths; it does not describe real peppered-moth colour genetics. Create a fresh population with existing variation, rather than transforming chapter 4's individuals.

Hide the many pairs in the main canvas and show a visually continuous range of shades. Adult notes explain that the previous inheritance rule now repeats at many genes. New combinations can produce new shades, but no new versions appear.

### Actions and history

- Start with 48 moths clustered around the middle shade, with differing inherited combinations and both versions present at every modelled locus.
- A **Bark shade** slider runs Dark to Light, initially towards light (`0.8`). Keep the same 48 → 96 → 48 cycle and selection rule. As in chapter 4, environment changes take effect at the next cycle boundary.
- The first two generations default to step-by-step presentation, but the instructor can change speed immediately.
- Provide **Next generation**, **Play**, **Pause** and **Slow / Medium / Fast**. Speed affects presentation and generations processed per second, not inheritance or selection strength.
- Fast mode shows snapshots and accumulating history instead of every birth and bird. Compute and retain every intervening generation and parent link.
- Show population distributions across generations. A mean line may be secondary but cannot replace the spread and overlap.
- **Compare start and now** shows generation 0 and the live population at the same scale.
- A history scrubber pauses playback and shows any completed generation. It is inspection, not simulation branching. **Back to latest** restores the live view; playing or changing bark while inspecting returns to latest with clear feedback first.
- Select a moth and **Trace its family**: show both actual parents, shades and generation numbers. Follow either parent's ancestry one generation at a time, with breadcrumbs. Label a followed chain “One line of ancestors”, not the whole ancestry.
- Use side-by-side specimens, never a moth morphing into its descendant. Retain non-surviving offspring in family records so siblings and survival can be inspected.
- Mark bark changes in history. Reversing direction is allowed but does not guarantee reversal of the population shift.
- Stop at 200 generations per experiment, preserving history and inviting inspection or reset. This is a storage/presentation limit, not a biological endpoint.

### Discovery and limits

Suggested experiment: hold light bark steady, run several dozen generations, then compare the starting population, recent families and one ancestry line. Ask “Where did these differences come from?” and “Did any moth decide what colour its offspring should be?”

The intended observation is a population shift with overlap between nearby generations. Do not guarantee that every offspring lies between its parents' shades or every generation moves towards the background. Combinations of existing copies can make offspring lighter or darker than either parent.

A fixed population cannot invent a new colour. An all-white-to-all-black journey and reaching a chosen endpoint are not requirements. Exhausted variation and slowed change are valid outcomes. Never add noise, hidden mutations, replacement moths or automatic rescue.

### Exit idea

“Small inherited differences, repeated across many generations, can make distant descendants look quite different.” Keep the canvas available with **Explore again** and chapter navigation. No speciation badge or human-evolution conclusion.

## Scientific and simulation contract

### Model A: one gene

Chapters 2–4 model one diploid locus, each copy Light or Dark. Light/light yields light appearance; any Dark copy yields dark appearance. Each offspring independently samples one copy from each parent with equal probability.

Construction controls deliberately build specimens; they are not changes to living moths. Reproduction cannot change a transmitted copy. Cosmetics neither affect survival nor claim to model additional inherited traits.

### Model B: many contributions

Chapter 5's initial implementation baseline is:

- 32 independent diploid loci with Light and Dark versions.
- At each locus, independently transmit one copy per parent. This abstracts independent assortment without teaching chromosome mechanics.
- Shade is `number of Light copies / 64`, giving 65 closely spaced shades from 0 (dark) to 1 (light). Render a visually continuous range; omit numbers from the main child view.
- Each founder has approximately 40–60% Light copies, distributed differently across loci. Seeded initialisation includes both versions at every locus across the founding population. Apply this condition only to founders; never preserve it artificially thereafter.
- Derive appearance only from inherited copies. Do not average parental shades and add Gaussian noise.

Locus count and founder spread are prototype tuning values. Adjust before implementation sign-off if necessary for observable progression and family resemblance, recording changes here. Inheritance-only variation and honest loss of versions are fixed requirements.

### Selection

Chapter 4 maps light appearance to `p = 1`, dark to `p = 0`, and bark to `b = 1` or `b = 0`. Chapter 5 uses the continuous values. Mismatch is `d = abs(p - b)`.

Initial survival weight: `w = 0.2 + 0.8 * (1 - d)^2`. Select exactly 48 of 96 offspring by weighted random sampling without replacement. A weight is not an individual survival probability. One precise algorithm draws independent `u` in `(0, 1)` per offspring, ranks by `-ln(u) / w`, and retains the 48 lowest keys, with stable-ID tie-breaking.

Every candidate has a chance; closer matching improves that chance. Fixed survivor counts deliberately keep population size out of this lesson. Adult notes state that real birds do not eat exactly half a generation and the formula is illustrative, not fitted to field data.

Selection strength can be tuned during prototyping. It must never depend on desired outcomes, predictions, cosmetic traits, playback speed or chapter 1 daylight. This version asserts no quantitative daylight/predation relationship.

### Randomness, identity and storage

- Separate streams for pairing/inheritance, survival, cosmetics and layout. Tapping, resizing, inspection and animation frames cannot consume biological random draws.
- Each individual records ID, parent IDs (null for founders), birth generation, immutable copies, derived shade/form and cosmetic seed. Survival is a recorded event.
- Record model version, initial population, simulation seed, per-generation environment, offspring and survivors. Keep enough state for identical replay after reload.
- Identical inputs yield identical biology at every speed and motion setting.
- Lost versions never reappear through reproduction. Reinitialisation is the only way to restore absent starting variation.
- Trends emerge across runs; individual runs can be non-monotonic. Never silently reroll inconvenient outcomes.
- Bound every population run at 200 generations, including chapter 4. Keep the current single run, two comparison runs and chapter 5 run; replacing an experiment explicitly discards its old history after confirmation.

## Accessibility and motion

- Accessible control names, visible focus and touch targets at least 44 × 44 CSS pixels. Sliders support keys and labelled endpoints; drag actions also have tap/button alternatives.
- Gene circles have Light/Dark labels and distinguishable markings as well as fill. Family views label parental origin.
- Chapter 1's low scene visibility is intentional. Reveal and a labelled specimen list offer equivalent exploration without visual search. Do not conceal information from assistive technology to preserve a game.
- Charts have text summaries and an accessible generation list. Family inspection describes appearances, relevant copies, parentage and survival.
- Essential text and controls meet WCAG AA contrast independently of scene lighting. Markers and focus indicators remain readable at minimum daylight.
- Honour reduced-motion preferences and provide a motion toggle. Use immediate states and event labels instead of movement, preserving information and outcomes.
- Pause simulation and decoration when the page is hidden. Returning leaves playback paused.
- Sound is outside first-version scope; no information depends on it.

## Technical delivery

- Static Vite + TypeScript + React app at `apps/moth/`, using the root package/lock files and `vite.shared.ts`.
- Copy relevant renderer source from `apps/moth-studio/` and adapt it within Moth. No runtime imports across app directories. Keep Moth Studio independently runnable and its binary-form API intact.
- Studio's four-specimen renderer and exaggerated faces are not a population camouflage simulation. Add simple population silhouettes and quiet search presentation; prototype on iPad before expanding detailed SVG workloads.
- Separate deterministic simulation functions from React and animation. Use typed models for inheritance, generation progression, selection and history. Keep tests in the app's tests directory.
- Precompute biological events independently of their presentation. Pause, skip and navigation cannot add births/deaths. Batch fast-mode work in bounded chunks to keep input responsive.
- Persist completed actions/generation boundaries; do not serialise all history every animation frame or slider movement.
- Register title, description, icon, colours and PWA metadata in `app-registry.json` when implementing the runnable app. Do not list this specification as a runnable app.
- Create local icons. Preserve the pre-JavaScript `Loading...` view with the manifest icon, empty image alt, explicit dimensions and inline essential styles. Match inline `html`, `body` and root backgrounds to manifest `background_color` and document `theme-color`.
- Use shared Workbox/Vite PWA generation to precache the entire shell, local fonts, icons, manifest and generated JS/CSS. Serve the cached shell immediately with background updates, clean obsolete caches and activate updates automatically. No hard-coded generated filenames or dynamic-data caching.
- Support arbitrary static-server subpaths, independent installation and offline reload at the app's path.
- Keep root `just dev moth`, `just build` and `just ci` workflows and the existing placeholder deploy recipe. Update root and app READMEs when implementing.
- Where deployment headers are configurable, use immutable long-lived caching for hashed assets and revalidation for HTML, manifest and service worker. Do not assume GitHub Pages supports custom per-file headers.

## Acceptance and evaluation

### Functional and scientific checks

1. All chapters open directly from complete presets, progress sequentially and preserve work on return. Leaving playback pauses it without changing outcomes.
2. Bark/daylight changes preserve chapter 1 positions and inherited appearances. Whole moths and bark share the treatment; controls remain readable. Cartoon details or motion do not reveal hidden moths.
3. All four ordered gene-copy pairs map correctly to three distinct combinations and two appearances. Order does not affect appearance.
4. Each offspring inherits exactly one copy per parent per locus. Test possible outcomes for all one-gene parent combinations; large samples approach theoretical frequencies without enforced brood ratios.
5. Manual construction does not enter chance tallies. Parent editing cannot rewrite offspring.
6. Every completed population cycle has 48 parents, 96 offspring, 48 deaths and 48 next parents. Offspring have two distinct recorded parents from the preceding live population.
7. Matching improves survival across a fixed ensemble of seeds while allowing individual exceptions. No survival weight is zero.
8. Absent versions cannot reappear. A fixed many-gene population cannot invent shades after a background change. New combinations trace to actual parental copies.
9. Fast/slow play, replay, reload, reduced motion and skipped animation produce identical biology for identical inputs. Inspection cannot mutate history.
10. Ancestry links resolve to real records, preserve both parents and do not substitute convenient-looking ancestors. Counts and distributions match survivors.
11. Reset, comparison and new-chance actions behave as labelled. Comparison preserves the saved single run. History limits pause gracefully and leave inspection available.
12. Keyboard, touch and assistive routes work at iPad and narrow layouts. Storage failure does not prevent use.
13. Production checks verify manifest, service worker and all JS/CSS precache entries. Verify offline reload and direct chapter links under a nested path, including after a PWA update.

Use deterministic unit tests for contracts and reproducibility, plus a documented ensemble of at least 100 seeds for directional selection checks. Set meaningful trend thresholds after prototyping and before final evaluation. Do not demand that every random run demonstrates the expected trend.

### Prototype gates

Before completing the full visual implementation, check:

- Does daylight make the comparison understandable on a physical iPad without producing a black screen or revealing moths through faces?
- Can a child connect one expanded family to a population without believing the family represents every moth?
- Does the many-gene baseline shift visibly over a few dozen generations while retaining useful overlap between adjacent generations?
- Do the population canvas and ancestry drawer remain responsive through 200 generations?

Population size, locus count, selection weights and lighting endpoints are initial design values. Tune openly from these checks, never by hiding inconvenient outcomes.

### Guided child evaluation

Try the complete sequence with a small number of children around the target age. Ask them to narrate events and explain a new example rather than judging successful taps. Listen for:

- “The bark/daylight changed the moth's genes.”
- “Dark is stronger, so it always gets passed on.”
- “Four babies must include one light one.”
- “Birds knew which genes to remove.”
- “Moths changed because they wanted or needed to.”
- “A new version appeared when the population ran out.”
- “One moth lived for all those generations and slowly changed colour.”

Success means explaining the inheritance–survival–reproduction chain with evidence from the canvas and distinguishing display changes from changes across generations. Confusion should prompt better interactions or explanations, not compulsory quizzes or more terminology.

## Evidence and adult-note references

These inform the framing and are not runtime dependencies.

- [Kelemen et al. (2014): young children learning natural selection through a coherent story](https://pubmed.ncbi.nlm.nih.gov/24503874/).
- [Buchan et al. (2020): replicated comparison of primary evolution teaching sequences](https://pmc.ncbi.nlm.nih.gov/articles/PMC7718267/).
- [NHGRI: alleles as alternative gene versions](https://www.genome.gov/genetics-glossary/Allele).
- [Butterfly Conservation: peppered moths and natural selection](https://butterfly-conservation.org/moths/why-moths-matter/amazing-moths/peppered-moth-and-natural-selection).
- [Cook et al. (2012): selective bird predation on peppered moths](https://pmc.ncbi.nlm.nih.gov/articles/PMC3391436/).
- [Walton and Stevens (2018): bird vision and survival value of moth camouflage](https://www.nature.com/articles/s42003-018-0126-3). Supports camouflage as consequential; it does not calibrate the daylight slider or selection formula.

The model deliberately avoids naming a molecular effector at the colour locus. Molecular details and excluded intermediate peppered-moth forms are unnecessary for these learning outcomes.
