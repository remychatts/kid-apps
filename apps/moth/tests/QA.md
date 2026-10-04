# Moth browser and teaching checks

## Initial implementation browser checks

- Landscape iPad viewport (1024 × 768): all chapter navigation is reachable; the page has no horizontal overflow.
- Shared daylight treatment: keyboard slider input dims moths and bark together, while reveal markers and controls stay readable.
- Gene-copy exploration, selected-parent transfer, chance broods and visible egg/sperm contributions.
- Navigation out of a pending conception, with the already selected birth retained.
- Stepwise population generation, no premature survival reveal, and same-founder woodland comparison.
- Fast playback through 200 many-gene generations, bounded history and the disabled next-generation control.
- Actual parents and grandparents inspected from the recorded generation-200 ancestry.

- Phone viewport (390 × 844): all five chapters fit without horizontal page overflow; the chapter strip scrolls independently.
- Replay pauses within recorded history, with resume available even after the live run has reached 200 generations.
- Production app served beneath `/lesson/moth/`: direct chapter links and local fonts/assets work.
- Service-worker update from an unminified build to the final production build: the new hashed bundle takes over automatically and the saved brood remains intact.
- Immediate reload after creating another brood retains all eight offspring. This check found and removed an earlier delayed-save race.
- With the preview HTTP server stopped, reload retains the saved brood; direct chapter-5 reload and advancing a generation also work from the cached application shell. The same checks run after the service-worker update.

## Interaction revision checks (October 2026)

- Each chapter-2 phenotype reveals independently and hides after a gene edit. Selected parent controls match the preview; Next carries the new choices into chapter 3.
- A completed guided birth advances to the next ordered combination without increasing the chance tally. Random brood generation adds four independent offspring to that tally.
- Chapter 4 preserves Medium speed through Reset chapter, shows 96 offspring, renders 48 bird strikes in Predation, and returns to 48 parents with a shrinking tree.
- Chapter 5 remains playing when the bark slider changes, runs beyond 200 generations, and reloads at the saved generation (436 in the browser run). Its rolling graph explicitly distinguishes founders from recent generations.
- The stronger dim-light endpoint visibly reduces contrast for mismatched moths while controls remain clear. All five revised chapters fit a 390 × 844 viewport without horizontal page overflow. Mute survives a production reload.
- Existing first-release saved progress loaded through the migration, and no browser console errors were reported in the revised flow.

## Bark and animation revision checks (4 October 2026)

- Header mismatch control starts at the original palette, changes bark at intermediate and maximum settings, and leaves transmitted copies and moth appearances intact.
- Chapter 3 expands the yellow life-cycle area with exactly two transmitted copies, shows the correctly dark adult for D/D, D/L and L/D and the light adult for L/L, then flies it to the recorded example without increasing the chance tally.
- Chapter 4 renders 48 strikes, with visibly recognisable birds approaching, resting over prey and departing even when manual steps use Fast speed. Medium and Fast Play advance directly through completed 48-parent generations; Slow Play reaches the offspring and predation teaching phases.
- At 390 × 844, the new toolbar wraps beneath the brand and the page has no horizontal overflow. The life-cycle panel and offspring examples also fit the 1024 × 768 tablet layout.

## Automated checks

`just ci` checks formatting, lint, types, all 47 repository tests (24 for Moth), all app builds and generated service-worker precache entries. Moth's tests include 100-seed selection ensembles, true parentage, mutation-free inheritance, reproducibility, history bounds, saved-state validation and preservation of exact founders when repeating experiments. New checks verify exact original bark colours, 10% HSV-value compression, doubled segregation spread for mixed parents, visible shade variation after 40 generations and intact legacy 32-locus saves.

## Human evaluation still needed

An emulated viewport does not reproduce a physical iPad's display in changing room light. Check the daylight endpoints and generation-tone volume on hardware. Audio scheduling, pitch mapping and mute are covered by a mock AudioContext test; automated browser checks do not assess speaker output. A guided session with children is also needed to assess comprehension: ask them to narrate inheritance, survival and reproduction, rather than treating correct taps or a working simulation as evidence of learning.
