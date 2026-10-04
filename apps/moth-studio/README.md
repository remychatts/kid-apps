# Moth Studio

A touch-friendly workshop for four cheerful SVG peppered moths. Broad triangular resting wings, irregular peppering, scalloped edges and a slim abdomen preserve the species' general silhouette. Oversized amber eyes, a smile and gently moving antennae add personality.

Run `npm run dev -- moth-studio` from the repository root. `just ci` checks and builds all apps, including this one. The demo is an independently installable, offline-capable PWA using the shared Vite configuration.

## Reuse in a genetics app

Import `Moth` from `src/Moth.tsx`. Its own motion stylesheet is imported automatically; the demo's layout and fonts are not dependencies of the component. SVG backgrounds are transparent, and width follows the parent container.

```tsx
<Moth
  form="typica"
  seed={42}
  features={{ eyeSize: 1.12, antennaLength: 0.95 }}
  animated={true}
  label="Pip, a light peppered moth"
/>
```

`form` is required and accepts only `typica` or `carbonaria`. The host app owns the single-gene model and maps its genotype to this explicit form. This component does not implement inheritance or insularia. Cosmetic anatomy, facial expression and markings are not genetic traits in this model.

`seed` is a 32-bit unsigned integer controlling repeatable anatomy, mirrored markings and animation timing. Keep it stable for each specimen. Switching form preserves all cosmetic parameters. `createSpecimen(seed, form)` returns serialisable props; the demo's **Save settings** button downloads those props as JSON. No personal data or network service is involved.

Optional `features` override individual seeded values. Each value is a multiplier, with 1 corresponding to 100% in the demo. Values are clamped; non-finite inputs fall back to the seeded value.

| Parameter       | Minimum | Maximum |
| --------------- | ------- | ------- |
| `eyeSize`       | 0.80    | 1.22    |
| `eyeSpacing`    | 0.85    | 1.15    |
| `wingSpan`      | 0.85    | 1.12    |
| `wingDepth`     | 0.85    | 1.15    |
| `antennaLength` | 0.70    | 1.25    |
| `bodyLength`    | 0.80    | 1.25    |

`bodyLength` stretches the segmented abdomen from its attachment beneath the thorax, keeping the face and wings in place.

Changing the seed changes the pepper pattern as well as anatomy. **Shuffle look** affects only the selected specimen and preserves its form. **Reset look** restores that slot's original seed and anatomy, also preserving its current form. **Meet a new bunch** regenerates all four cosmetic identities while preserving their forms. Changes are held for the current session; saved JSON can be passed back into the component by a host app.

## Motion and accessibility

CSS animates a brief blink, an occasional subtle resting-wing flex and a gentle antenna sway, with seed-dependent timing. Motion is decorative. `animated={false}` restores the neutral open-eyed pose. Reduced-motion preferences always disable animation; off-screen specimens and hidden tabs also stop animating. There is no JavaScript frame loop and no external image dependency. React's unique IDs keep gradients and clipping isolated between instances.

Four specimens are the intended workload. About 245 irregular SVG flecks per wing provide peppering without raster assets, filters or animated path geometry. Dark forms retain only very faint texture. The simplified bark backdrop is decorative, not a camouflage simulation. Colour contrast and cartoon faces are intentionally exaggerated.

## Checks

The root test command includes reproducibility, cosmetic range safety and form/appearance separation tests. The root production verifier checks the manifest, service worker and complete JavaScript/CSS precache. Browser checks cover selection, independent changes, form switching, randomisation, JSON export, motion settings, narrow/iPad layouts and offline reload beneath a nested site path.
