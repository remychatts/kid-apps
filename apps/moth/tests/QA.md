# Moth browser and teaching checks

## Browser checks during implementation

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

## Automated checks

`just ci` checks formatting, lint, types, all 27 repository tests (15 for Moth), all app builds and generated service-worker precache entries. Moth's tests include 100-seed selection ensembles, true parentage, mutation-free inheritance, reproducibility, history bounds, saved-state validation and preservation of exact founders when repeating experiments.

## Human evaluation still needed

An emulated viewport does not reproduce a physical iPad's display in changing room light. Check the daylight endpoints on hardware. A guided session with children is also needed to assess comprehension: ask them to narrate inheritance, survival and reproduction, rather than treating correct taps or a working simulation as evidence of learning.
