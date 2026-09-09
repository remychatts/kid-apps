# Kid Apps

Everything here is vibe-coded.

A monorepo for fifteen playful, family-friendly web apps and the catalogue that links them together. Every app is independently runnable and installable, while one root build assembles the complete static GitHub Pages site.

## Apps

| App                                                        | What it does                                          | Last updated in the original history |
| ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| [24-Hour Clock](apps/24-hour-clock/)                       | Explores a full day at an adjustable playback speed.  | March 2025                           |
| [Arial vs Helvetica](apps/arial-vs-helvetica/)             | Teaches the differences between two similar fonts.    | August 2026                          |
| [Drawing Prompt Machine](apps/drawing/)                    | Spins up a fun drawing challenge.                     | January 2026                         |
| [Frogball Final!](apps/frogball-final/)                    | Puts you in charge of a frog football team.           | August 2026                          |
| [Guess Lab](apps/guess-lab/)                               | Compares number-guessing algorithms and statistics.   | September 2026                       |
| [Imposter!](apps/imposter-game/)                           | A pass-the-phone secret-word game for 3–8 players.    | July 2026                            |
| [Jungle Baby Snake Rescue](apps/jungle-snake/)             | A jungle rescue game starring a purple snake.         | April 2026                           |
| [Pet Chooser](apps/pet-chooser/)                           | Matches players with a companion from a cast of pets. | December 2025                        |
| [Penguin Peak!](apps/penguin-slide/)                       | Slides a penguin down an obstacle-filled icy hill.    | August 2026                          |
| [Podcast Episodes](apps/podcast-episodes/)                 | Loads and filters episodes from an RSS feed.          | July 2025                            |
| [Practice Stars](apps/trumpet-practice/)                   | Builds practice streaks and unlocks reward pictures.  | August 2026                          |
| [Probability Explorer](apps/probability-explorer/)         | Visualises repeated samples as live histograms.       | April 2025                           |
| [Rounding Rally](apps/rounding-game/)                      | A visual estimation and rounding game.                | August 2026                          |
| [Snake Species Visualiser](apps/snake-species-visualiser/) | Makes snake-species statistics tangible as a grid.    | April 2026                           |
| [Trumpet Fingering](apps/trumpet-fingering/)               | Practises matching trumpet notes and fingerings.      | January 2026                         |

The displayed dates for the original six apps come from the most recent commit affecting each app in `simonchatts/alyx` at the time of extraction. Dates for the four archive imports come from their member modification timestamps in `apps.tgz`. Dates for the trumpet apps come from the latest source commit at import time; their READMEs record the exact commit.

## Development

Install the single shared dependency tree:

```sh
npm install
```

Start the catalogue or one app:

```sh
just dev
just dev drawing
just dev imposter-game
```

Run all checks and assemble the Pages site in `dist/`:

```sh
just ci
```

The app list, catalogue copy, dates, precise update timestamps, colours, PWA metadata and build targets are coordinated through `app-registry.json`. The catalogue uses `updatedAt` to keep apps in newest-first order, including apps with the same displayed month. Add a new app there and under `apps/<id>/`, then give it a `vite.config.ts` built with `createAppConfig`.

## Structure

```text
apps/
  catalog/                  # The site index
  <app-id>/                 # One isolated Vite entry point per app
app-registry.json           # Shared app metadata
scripts/                    # Build, development and verification tools
vite.shared.ts              # Shared relative-path and PWA configuration
dist/                       # Generated combined Pages site
```

Each service worker is scoped to its own app directory. The catalogue owns the root scope. All application-shell files are precached, stale caches are cleaned up, and updates activate automatically.
