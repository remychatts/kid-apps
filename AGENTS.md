# Working in this repository

Use UK spelling in user-facing copy and documentation.

## Publishing

The pipeline for this repo is the remychatts/kid-apps repo, which is public, and builds a GitHub Pages site with using GitHub actions. Unlike all other repos, this is the final destination, and does not require human approval for you to merge PRs: when you have a good release candidate, first run a series of checks, and if those pass, merge to main and publish an update. The checks are:

 - running CI checks (typechecking, tests, code formatting, etc)
 - validating that there are no API keys or other secrets embedded in the changes being published

If in doubt, stop and ask for guidance.

## Source of truth

`app-registry.json` is the source of truth for the six app IDs, catalogue copy, history dates, colours and PWA metadata. Keep it in sync with any app addition, rename or visual identity change.

Each app lives at `apps/<id>/` and must remain independently runnable through `npm run dev -- <id>`. Shared build and PWA behaviour belongs in `vite.shared.ts`, not duplicated across app configs.

There is one root `package.json`, one `package-lock.json` and one root `node_modules/`. Do not add app-level package or lock files. Prefer a shared dependency version unless isolation is technically necessary.

## Checks

Run `just ci` before pushing. It formats, lints, typechecks, builds all apps and verifies that each output has an entry point, manifest, service worker and precached JavaScript/CSS bundles.

The combined static site is generated at `dist/`: the catalogue is at its root and apps are in matching subdirectories. All URLs must work beneath an arbitrary GitHub Pages repository path, so keep Vite's relative base and avoid root-relative runtime asset URLs.

## App changes

Preserve family-friendly language, touch controls and accessible labels. Keep the pre-JavaScript loading view in React app entry pages, with inline background styling and the manifest icon. Every app must remain offline-capable; do not add dynamic-data caching without defining its freshness and privacy behaviour.

Add a concise module comment to new source modules and a short comment to new functions. Executable scripts need a top block comment with example invocations and executable permissions.
