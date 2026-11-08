# Daily Stars

Run from the repository root with `npm run dev -- daily-stars`.

A single-child, offline-capable daily adventure tracker, designed for an iPad
Home Screen. Setup asks for a name or unique nickname. Nine starter goals can
be renamed, hidden, restored or extended in settings. Hiding preserves history.
Each goal earns one square per local calendar day; a second tap undoes a mistake.
The previous seven days can be edited. An open app refreshes its date after midnight.

Completions fill six hand-drawn mosaics from bottom to top, in the order they
were entered (including backdated entries). The 72-square star comes first;
other designs contain 61–80 squares. Completed mosaics appear in the medal
collection; extra wins flow into the next design and the sequence repeats.
Undoing a completion recalculates medals, so an accidental tick cannot earn a
permanent extra reward. A saved celebration high-water mark avoids repeated
applause when undoing and rechecking the same goal. Statistics include hidden
goals and offer all history or today plus the previous 29 calendar days.

State lives under `daily-stars-v1` in localStorage. Server backup follows Practice
Stars' WebDAV protocol: Basic authentication as `stash`, PUT a localStorage-style
JSON snapshot, create the app directory with MKCOL on a 409, and GET to restore.
The same-origin endpoint is `/stash/daily-stars/<encoded-normalised-name>.json`.
Names are lowercased and NFC-normalised, then URL-encoded; different children
should choose distinct names. This root-relative server endpoint deliberately
matches the existing server contract; app assets use relative URLs.

Enter the stash password in settings and enable automatic backups. Writes are
debounced and serialised, and retry when the connection returns. The password
is stored separately on the device and never uploaded in the snapshot. Restore
validates the entire snapshot and asks before replacing local progress. A new
device can restore directly from the welcome screen, before any uploads occur.
Server data is never service-worker cached. A compatible stash server must be
available on the hosting origin; static-only hosting cannot provide this endpoint.

The shared PWA build precaches fonts, icons and the applause sample copied from
Practice Stars. Sounds can be muted, and reduced-motion preferences are honoured.

Tests: `node --test apps/daily-stars/tests/*.test.mjs`. Full checks: `just ci`.
