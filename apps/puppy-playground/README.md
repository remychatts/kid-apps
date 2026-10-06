# Puppy Playground

A small Vite, TypeScript and React test app for the [Q1–Q4 puppy drafts](../../characters/puppy/animations/README.md). It displays the neutral smiling puppy on load. Click to try breathing, slow blink, either curious head tilt or look-around-and-attend. Breathing loops; the other gestures return to neutral. The Neutral stance button stops a preview with a short blend.

Use the front, side and three-quarter views and half-speed playback to inspect the face, ears and grounded paws. The app follows the system reduced-motion preference; ticking Enable motion previews explicitly enables review. Rendering pauses while hidden, resumes in neutral, and sleeps once the puppy is resting. Loading and WebGL errors have accessible text fallbacks.

```sh
npm run dev -- puppy-playground
just dev puppy-playground
just ci
```

The app uses the repository's shared dependency tree, registry and PWA configuration. Vite imports the GLB directly from the character animation directory as a content-hashed local asset. Workbox precaches it with the complete shell, so the puppy remains available offline. No remote assets or dynamic-data caches are used. URLs remain relative for GitHub Pages subdirectories.

`tests/animations.test.mjs` loads the real exported file through Three.js and tests clip timing, restored neutral poses, planted paws, full blink closure and the two tilt variants. The Blender authoring source and fresh-import validation are documented with the animation assets. Oldest-iPad performance and final visual approval remain future review work.
