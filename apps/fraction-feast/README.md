# Fraction Feast

Fraction Feast helps a child connect equal shares of one whole with fraction words, notation and percentages. It is designed for landscape iPads and works offline as an installable PWA.

Challenge mode teaches one relationship at a time: first build the requested pie, then match it on a numbered hundred-square. Choose sharing between 2, 4, 5 or 10 people; each level follows a deliberate teaching sequence. “Words only” removes the sharing story when it is no longer needed.

Explore mode is an open teaching display. The pie fraction and percentage remain independently adjustable so a teacher and student can make examples, compare them and see when the areas match.

From the repository root:

```sh
npm run dev -- fraction-feast
npm run build
npm test
```

`just ci` runs the repository checks, including regression tests for all challenge amounts and the exact pie-to-grid area mapping. Sounds and the best streak stay on this device; the app has no accounts or network services. Explore currently offers 2, 4, 5 and 10 equal shares, with an independent 0–100% control.

The pie image is generated artwork; its provenance is recorded in `ARTWORK.md`.
