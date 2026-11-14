# A.6 — Mineral Flesh

Date: November 13, 2026

## Scope

An experimental 2.5D art-material layer on top of the existing A.1–A.5 simulation. **Nothing here is a physically faithful 3D faceted solidification model.** The growth engines are unchanged except for persistent first-deposition timestamps for phase cells. The renderer does not update the fluid, phase fraction, RNG or colony identities.

## Material field

- Each phase cell now records `birth[i]`, the tick+1 of its first crossing into solid occupancy. A zero denotes never-solid, or material removed by the melt brush.
- When a solid cell melts its timestamp becomes 0. Upon crossing the solid threshold again, its `birth` is updated to that tick+1.
- `PhaseField.snapshot()` and `restore()` include the new timestamp array; Restart and Refresh reconstruct it from their saved composition seed.
- A two-pass eight-neighbor *chamfer distance transform* produces a local depth proxy: occupied interiors are higher and exposed edges taper away. This is a **height illusion** based on the actual solid geometry, not voxel reconstruction.
- The phase-gradient and relief-gradient orientation, quantized toward the underlying grain orientation and fold count, produces facet-like bands of light and shadow.
- Palette sampling combines grain ID, recorded deposition epoch, optical direction, and material sliders; this exposes and uses the complete palette including 12-stop recipes.

## Available finishes

1. **MINERAL RELIEF** — raised facets and restrained structural lighting.
2. **STRATIFIED GHOST** — growth-tick bands visible in more translucent material.
3. **PRISMATIC OXIDE** — stylized palette-index shifts correlated with surface orientation and relief; **not spectrally integrated thin-film optics**.
4. **OBSIDIAN** — deliberately dark faces with selective metallic edge flashes.

Classic Frost, Glass and Metal remain available unchanged. Segment-based growth (dendrite tips, discrete front deposits) also receives a lighter 2.5D stroke treatment when the new finishes are selected, but full distance-field relief currently applies only to actual phase-field solids.

## Controls

In **FINISHES**, select a new finish; it reveals four grouped sliders:

- **Facet relief** — strengthens quantized normal shading.
- **Growth layer banding** — reveals generations of chronological deposition.
- **Light direction** — rotates the single virtual light.
- **Spectral color separation** — varies the palette with material orientation and time.

Changing a finish or slider invalidates only the cached rendered layer, **not** simulation state. Existing complete 199-entry palettes, per-stop editing, New Seed, Refresh and Restart remain intact. High-resolution PNG still exports the same visual layer; phase-field *simulation* resolution stays coarse and enlargement is an artistic interpolation, not 2400×2400 physical sampling.

## Honest limits and performance

- No 3D volumetric geometry, reflection probe, transmitted ray, physical polarization, Fresnel refraction or full crystal birefringence yet.
- Chamfer relief and RGBA material shading are recalculated on a new phase-field version or changed color/light control; a retained image buffer is reused otherwise.
- This is a CPU/Canvas2D renderer, designed to avoid external packages. Profile on real iPhone Safari before promising sustained 60 fps or heavier materials.
- Numerical tests check growth-time state and renderer isolation, plus visual browser checks on Chromium at mobile-sized and desktop viewports; this is not a substitute for actual iOS hardware testing.

## Source

- `src/mineral.js` — pure deterministic material transformation and distance-field helper.
- `src/phase.js` — first-solidification timestamps, melt, snapshot/restore.
- `src/main.js` — finish selection, grouped sliders, cached image rendering and legacy branch stroke lighting.
- `tests/mineral.test.mjs` — new consistency and materials isolation tests.

## Next

Prototype *true thickness and internal fracture maps*, more selective iridescence, and a real separate geometry engine for skeletal terraces/Hopper crystals. Keep any future 3D mode optional so an iPhone never needs to simulate a cubic 3D grid for every frame.
