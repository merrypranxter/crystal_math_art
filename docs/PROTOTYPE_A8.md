# A.8 — CHROMATIC HERESY: radial growth and polarized light

**Status:** Implemented, integrated, and locally tested. Runs entirely in-browser. No Netlify deploy or Wolfram API calls. The model is a distinct discrete radially growing fibrous colony, **not** a thermodynamically calibrated spherulite solver.

## New artist-visible structures

1. **Spherulite / Radial Silk** — many radially organized fibrils expanding from a nucleation point.
2. **Rosette / Concentric Spectrum** — radially growing crystals with growth preference varying by distance and a stronger accumulated local director twist.
3. **Astral Spherulite / Faceted Fans** — angularly weighted radial growth that selects an asymmetric set of star-like sectors.

Choose the anatomy in **GROWTH**. Select PLANT on the artwork or **+ NEW SEED** to add an independent colony. **REFRESH** explicitly confirms then starts a new randomized arrangement using the selected anatomy; **RESTART** replays the original deterministic composition. Neither changes the selected palette. Existing crystals never change their family when the anatomy selector changes.

The new **RADIAL GROWTH** sliders group speed, ring rhythm, and fibril twist/disorder. The **POLARIZED HERESY** finish has analyzer angle, optical path/color order, and crossed-polarizer contrast controls. They change appearance only.

## Model and actual state

`src/spherulite.js` maintains a separate half-resolution field:
- cell owner (grain ID),
- persistent local fibril **director angle**,
- first deposition timestamp,
- retained concentric phase,
- local grain-to-grain boundary flags,
- potential interface cells with competing owner sets.

`SpheruliteField.advance` deposits new cells from seeded, live frontiers. Candidates compete based on nutrient availability, nearby solid neighbors, mode-specific angular sectors, radial ring rhythm and fibrillar orientation. The growth budget is distributed fairly among live colonies so one larger specimen cannot arbitrarily prevent a newer colony from expanding. The material updates the same global occupancy and nutrient reservoir as the older three crystal engines. When different owners meet, their occupied cells remain their own and the collision seam is recorded. The new geometry is persistent state and responds to MELT, FEED, undo and deterministic restarts.

Spherulite cells store their **director orientation at deposition**, which does not rotate when you change analyzer angle. The rendering function calculates a *crossed-polarizer-inspired* brightness term:

    I ≈ sin²[2(θ - α)] × sin²(δ/2)

where `θ` is the saved fibril director, `α` is the artist-controlled analyzer angle, and `δ` is a stylized radial-thickness proxy with editable optical path. The artist-selected palette supplies actual RGB colors sampled across full original stop sequences; optical orientation and growth rings influence sampling and brightness.

**Important scientific boundary:** this is an aesthetic crossed-polarizer analogy, *not* a physical birefringence calculation, wave-optics simulation, calibrated retardance, or complete radial solidification PDE. The other engines remain scientifically labeled as before.

## Preservation guarantees

- The three older engines (tip, accretion, phase) are unchanged in purpose and can coexist with this fourth engine.
- **199 palettes** = 194 unchanged canonical MATHEMAGICAL recipes from `src/palette-vault.js` plus the original five crystal-studio palettes from `src/palettes.js`.
- Original stop ordering and full stop counts (including 12-stop recipes) are retained; search, shuffle, edit swatches, random palette, random colors and Restore Original keep working.
- Palette and analyzer changes **never** edit crystal cells, nutrient, stored directors, or history.
- All controls work without any external network requests.

## QA

- `npm test` checks all inherited suites plus `tests/spherulite.test.mjs` (reproducibility, three morphologies, radial deposition, two-grain collisions, starvation prevention, melt/recovery, undo, zero-growth control, and optical-output independence from simulation).
- Standalone and modular source compile from the same project; `python3 scripts/build_standalone.py` embeds every source module and the palette vault for offline HTML viewers.
- Local browser smoke testing (desktop and mobile-size) confirms UI controls, PNG renderer path, seed/undo behavior and no JavaScript errors. Actual iPhone Safari hardware performance has **not** been validated.

## Next focused experiments

We should research and implement a more refined spherulitic director evolution (growth-induced twists and orientation defects), then physically better polarized optics using wavelength-specific retardance. Preserve the current radial engine as a reversible baseline.
