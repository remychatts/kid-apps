# Kid Apps

Everything here is vibe-coded.

A monorepo for six playful, family-friendly web apps and the catalogue that links them together. Every app is independently runnable and installable, while one root build assembles the complete static GitHub Pages site.

## Apps

| App                                                        | What it does                                          | Last updated in the original history |
| ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| [Drawing Prompt Machine](apps/drawing/)                    | Spins up a fun drawing challenge.                     | January 2026                         |
| [Imposter!](apps/imposter-game/)                           | A pass-the-phone secret-word game for 3–8 players.    | July 2026                            |
| [Jungle Baby Snake Rescue](apps/jungle-snake/)             | A jungle rescue game starring a purple snake.         | April 2026                           |
| [Pet Chooser](apps/pet-chooser/)                           | Matches players with a companion from a cast of pets. | December 2025                        |
| [Rounding Rally](apps/rounding-game/)                      | A visual estimation and rounding game.                | August 2026                          |
| [Snake Species Visualiser](apps/snake-species-visualiser/) | Makes snake-species statistics tangible as a grid.    | April 2026                           |

The displayed dates come from the most recent commit affecting each app in `simonchatts/alyx` at the time of extraction.

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

The app list, catalogue copy, dates, colours, PWA metadata and build targets are coordinated through `app-registry.json`. Add a new app there and under `apps/<id>/`, then give it a `vite.config.ts` built with `createAppConfig`.

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
