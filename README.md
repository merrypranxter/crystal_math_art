# CRYSTALLIZATION APOCALYPSE
### A living laboratory for impossible crystalline matter

**Project:** Mathematical crystal-growth art studio
**Repository:** `merrypranxter/crystal_math_art`
**Status:** **Black Ice Cathedral A.1 — runnable prototype.** Later crystal families remain research/design.

A crystalline growth front should actually advance through an environment. Seeds nucleate, branches compete for solute, crystals melt and regrow, and the artwork remembers its own history.

## Play / development

- **Standalone, no dependencies:** save [standalone.html](standalone.html) and open it in a browser or HTML viewer. The CSS, model and UI are embedded; no CDN, deployment, server or paid API is required.
- **Modular source:** open this repository as a local folder and serve it with `python3 -m http.server 8080` or `npm run serve`, then open `http://localhost:8080`.
- **Tests:** with Node 20+, run `npm test`. Six tests cover real advancing segments, deterministic evolution, nutrient consumption, melting, regrowth, undo and new seeds.
- **Do not deploy automatically.** Netlify deployment is deliberately deferred until the artist requests it.

## A.1 controls

**Canvas:** PLANT by tapping; MELT or FEED by dragging the artwork.
**Transport:** Pause/resume, one simulation step, undo last edit.
**GROWTH:** evolution speed, branching, sixfold directional preference, growth reach.
**ENVIRONMENT:** nutrient diffusion, supply and brush radius.
**FINISHES:** five palettes (including black ice and ivory) and three artistic surface treatments that do not reset the physics.
**STUDIO:** explicit confirmation for New Composition (undoable), statistics, export a 2400 × 2400 PNG.

The work-in-progress art has three seeded colonies by default. New structures grow incrementally. Changing material appearance never resets the material state.

## Scientific honesty

The first proof uses **resource-limited, anisotropic branching tips** on a persistent material occupancy grid. A two-dimensional dissolved-material concentration field diffuses, is consumed by growth, and recovers from a boundary reservoir. Tips compete for supply; surviving structures can regrow after local thermal damage.

This is a **physics-inspired growth approximation**, **not** a calibrated phase-field PDE solver, nor a mathematically exact DLA random-walker simulation. The finishes are stylized; physical birefringence and thin-film optics are reserved for later work. We will not call it physically accurate crystallization until that machinery exists.

## Planned proof families

1. **Black Ice Cathedral — A.1 runnable prototype:** actual branching/competition/melting/regrowth. Next: high-frequency needlelet detail, secondary growth and a stronger facet/relief renderer.
2. **Chromatic Heresy — planned:** oriented spherulitic colony growth, persistent grain boundaries and optical orientation.
3. **Bismuth Necropolis — planned:** skeletal/faceted step-front growth, real terrace geometry and restrained interference finish.
4. **Crystal Archaeology — research:** accumulated generational layers, growth history and sectional reveal.

## Files

- [Modular physics engine](src/growth.js)
- [UI and renderer](src/main.js)
- [Responsive layout](styles.css)
- [Standalone HTML build](standalone.html)
- [Automated tests](tests/growth.test.mjs)
- [Architecture](docs/ARCHITECTURE.md)
- [Research notebook](docs/RESEARCH.md)
- [Prototype implementation notes](docs/PROTOTYPE_A1.md)

## Creative standards

- Real, persistent mathematical growth instead of a shader cycling precomputed patterns.
- Distinct growth mathematics for each later engine — not presets of the same design.
- Strong monochrome silhouettes before optical fireworks.
- Mobile-first direct manipulation and grouped settings.
- Destructive actions ask before wiping art; new materials do not erase your work.
- No paid APIs, backend, or automatic Netlify deploys for this phase.
