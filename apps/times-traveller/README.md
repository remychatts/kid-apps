# Times Traveller

A colourful multiplication adventure starring Captain Whiskers and a time capsule. Optimised for landscape iPads, with a stacked phone layout and generously spaced, uniformly coloured answer buttons.

```sh
npm run dev -- times-traveller
just ci
just build
```

The gear opens mission control. Each of the 1–10 tables can be disabled or set to a multiplier limit from 1 to 10. Defaults are 1 × 2 through 5 × 2 and 1 × 3 through 5 × 3. Number order stays multiplier-first unless “Mix the number order” is enabled. Every integer from 1 to the largest configured product is available as an answer; larger ranges scroll naturally without shrinking touch targets.

First-try answers earn 10 star points. Mistakes reset the streak, offer a retry and leave the question in place; completing a retry earns 5 points. Every ten consecutive first-try answers unlocks a new era with confetti and a cheer. Correct-answer feedback advances automatically after 1.6 seconds, with a next button for quicker play. Time-jump celebrations wait for the player.

Settings, star points, current/best streaks and completed jumps persist under `times-traveller-v1` in localStorage. Changing tables or number order resets the current streak, keeping lifetime rewards. There are no accounts, analytics, APIs or external font requests. The shared PWA configuration precaches the app, artwork, fonts and audio for offline play after an initial visit. Sound can be muted; reduced-motion preferences remove animation. Native modal dialogs provide focus containment and Escape support.

## Assets

- `public/time-kitten.png`: original artwork generated using the built-in image generation tool. Prompt: “An adorable ginger kitten time traveller wearing round aviator goggles and a purple scarf, happily piloting a small turquoise and indigo retro time capsule, with a round glowing golden clock face and little rocket fins. Capsule floats inside a swirling lavender and cyan time portal, small golden stars and pink sparks. Premium playful 3D clay illustration, tactile rounded forms, charming expressive face, vivid colours, crisp silhouette. Square composition, entire subject visible with generous margins. Dark midnight violet background #161330, no text, no letters, no watermark.”
- `public/icon.svg`: local vector time-capsule icon, shared by the manifest and loading view.
- `public/cheering.mp3`: reused from `apps/trumpet-fingering/public/sounds/cheering.mp3`.
- Small success/retry tones are synthesised locally with Web Audio following a player gesture.

Pure model tests cover the default pool, all table limits, order reversal, repeat avoidance, scoring, milestones and malformed saved data. The root CI command also typechecks and verifies this app's production precache manifest.
