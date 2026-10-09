# Puppy Playground

A Vite, TypeScript and React review app for the [complete puppy animation draft library](../../characters/puppy/library/README.md). It starts with the neutral smiling puppy. Choose Quiet moments, Small wins, Big celebrations or Try again to preview all proposed movements, including left/right tilt and ear-twitch variants. Breathing loops; other movements recover to neutral.

Requests made during a scratch, jump, chase or flip wait until the protected support/landing section finishes. Only the latest click is retained and displayed as “Next”. The Neutral stance button follows the same rule. Three-quarter, front and side views, half-speed playback and automatic framing help inspect the face, ears, grounded paws and airborne movements.

The app follows the system reduced-motion preference; ticking Enable motion previews explicitly enables review. Rendering pauses while hidden, resumes in neutral, and sleeps while resting. Loading and WebGL errors have accessible text fallbacks.

```sh
npm run dev -- puppy-playground
just dev puppy-playground
just ci
```

Shared dependencies, registry metadata and PWA behaviour remain at repository level. The content-hashed local GLB is precached with the complete application shell for offline use beneath any static-server path. No remote assets or dynamic-data caches are used.

The tests load actual GLBs through Three.js: the original Q1–Q4 regression suite plus all 18 library clips, neutral recovery, planted contacts, airborne clearance and sustained downward acceleration through landing, chase stance stability and encouraging expressions. Playback policy tests cover safe interruption and latest-request queuing. Blender source, render previews and fresh-import validation accompany the assets. Final visual approval and oldest-iPad performance remain review work.
