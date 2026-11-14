# A.3 — Crystal Anatomy Gone Wrong: diffusion-coupled accretion fronts

Date: 2026-11-13
Status: new CPU-based, **physics-inspired** accretion module. Not a calibrated phase-field model, exact DLA, or a physically exact crystal kinetics simulator.

## What changed

- Added independent `src/front.js` system. Existing A.2 tip growth remains working and visually unchanged.
- Three new *per-nucleus* morphologies:
  - **Fourfold Facet Fans** — compass-like attachment preference, more compact deposition.
  - **Sixfold Skeletal Fingers** — angular front preference, tip-focused exposed interface deposition.
  - **Mutant Accretion Coral** — weak fixed-axis bias with stochastic, solute-selected fingers.
- The interface is an actual persistent solid/liquid boundary. New cells attach only adjacent to same-grain material, consume a local nutrient field, and alter future available sites.
- Stochastic, bounded tournament sampling picks among candidate boundary cells using nutrient availability, exposed neighbors, crystallographic-like kinetic orientation preference and a tunable concentration exponent.
- The **instability** control changes the exponent of concentration-dependent growth selection; **facet lock** changes the kinetic directional bias. These are artistic/physics-inspired controls, **not** temperature in Kelvin or the epsilon in the separate Wolfram surface-stiffness derivation.
- Front cells integrate with touch-melt and nutrient-feed gestures, composition changes, undo snapshots, deterministic RNG, rendering, high-resolution PNG, and the standalone HTML build.
- Multi-colony front growth respects occupied cells from other grains (no overwrite during growth), while previous tip anatomies still work in the same canvas.

## Why it is not a full phase-field solver

The simulation uses a 2D diffusion field with a four-neighbor explicit finite difference, bounded nutrient/recharge, and stochastic deposition at the solid-liquid boundary. Flux at each candidate is **approximated** by a locally weighted concentration, not computed as exact harmonic measure. It does not evolve a continuous order parameter with a Cahn-Hilliard/Allen-Cahn free-energy equation or rigorously handle anisotropic interface curvature. Its orientation bias is a kinetic heuristic, **not** the surface-energy stiffness formula verified by Wolfram.

## Wolfram audit

The earlier validated toy surface stiffness result has critical epsilon values 1/15, 1/35 and 1/63 for fourfold, sixfold and eightfold crystals respectively in gamma = 1 + epsilon cos(n theta). It must not be confused with these front growth bias controls.

The concentration diffusion stencil `c_next = c + d*(sumCardinalNeighbors - 4*c)` is a convex, positive update for nonnegative bounded fields when `0 <= d <= 1/4`, before additional explicit feed/recharge/clamping. A.3 retains A.2's UI diffusion coefficient range `0.01..0.24`; unstable timestep values above 0.25 are excluded. The live growth algorithm is still experimental.

## Visual integrity

The three new morphologies have different attachment rules, not merely a different shader or palette. `front:true` segments indicate actual accreted cells. Old material does not rotate or morph on setting changes. A material finish is independent from evolving geometry.

## Performance / known limitations

- Current solver is CPU-first and designed for accessible mobile Web browsers. At extreme high coverage, scanning eligible frontier candidates can become expensive; profiling and a GPU version remain future work.
- Melt strokes rebuild available growth sites from surviving material, currently using an O(N²) scan of the grid. This is acceptable for early tests, but needs optimizing for large mobile compositions.
- The fronts draw as many short material segments. They will benefit from future actual faceted geometry extraction, contour antialiasing, polygonal terraces, refractive materials and a more rigorously calibrated phase-field experiment.
- The new front types are chosen for *new* colonies. Existing colonies preserve their chosen morphology. Growth controls automatically switch between tip-specific and front-specific fields when selecting an anatomy, avoiding irrelevant sliders.

## Next scientific experiment

Implement a dedicated anisotropic diffuse-interface phase-field lab at a reduced simulation resolution, compare exact front advance and solute conservation with Wolfram reference arrays, and render true facets / layered height. Do not replace successful A.2 or A.3 engines until the new solver outperforms them visually.
