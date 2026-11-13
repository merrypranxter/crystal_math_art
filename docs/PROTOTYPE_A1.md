# Black Ice Cathedral — Prototype A.1

**Date:** 2026-11-13
**Status:** Running 2D physics-inspired proof, tested locally in headless Chromium (desktop and 390px mobile emulation), with six passing Node model tests. No Netlify or other deployment has been started.

## What is physically meaningful now?
- Growing tips have positions, directions, branching levels and independent lifetimes.
- Branches are deposited as immutable material segments, not frames of a prerecorded animation.
- A per-cell crystal-occupancy map records which grain has claimed that location.
- A separately diffusing, finite solute field fuels growth and is depleted by attachment.
- Grain identity survives after an arm grows. Encounter with another grain can arrest a tip.
- A sixfold orientation preference steers needles without making them rotate as a whole.
- The MELT brush deletes local history, heats cells and creates surviving rim tips. Thermal inhibition eventually falls away so branches can regrow into the region.
- The FEED brush restores local dissolved material.
- Undo captures simulation arrays, active tips, growth segments and the deterministic RNG state before touch edits.
- Artwork palette and finish choices affect rendering only; they never reset material state.

## What is still approximate or missing?
- This is **not** an anisotropic phase-field PDE or a calibrated thermodynamic model. Growth is simulated with advancing tips coupled to a nutrient diffusion field.
- It is not a walker-based DLA implementation. A real DLA or phase-field branch is a separate future engine experiment.
- Height/depth and full 3D crystal facets have **not** been built.
- 'Spectral' and 'glass' are illustrative color treatments, **not** wavelength-dependent birefringence or thin-film interference.
- Crystal-to-crystal collision currently arrests tips, but detailed grain-boundary physics is future work.
- 'Melting' removes segments locally and models a cooling exclusion field; it does not yet redistribute latent heat or mass accurately.
- Long-lived growth ends when tip families exhaust their lifetimes or boundaries; spontaneous nucleation and continual ecology are later phases.
- PNG export exists. GIF/MP4 capture, exact seamless loops and 9:16 composition are **not** implemented in A.1.
- Browser WebGL acceleration is not included yet; the first version deliberately uses a simple CPU model and canvas renderer to make the simulation inspectable and avoid platform dependency.

## Validation
The test suite verifies:
1. Branches grow and solute is consumed.
2. Growth is deterministic with identical seeds and controls.
3. Melt edits remove only local material.
4. Undo restores the exact recorded world state.
5. Adding a new seed does not reset existing material.
6. Growth resumes after local thermal recovery.

**Visual validation:** Chromium desktop and emulated iPhone-sized layout, including canvas touch melting, undo and palette changes. This is not a physical iPhone Safari device test; actual device QA is still required.

## Next recommended iteration
A.2 — **Frost Anatomy**
- Add true leaflike secondary needles and fine crystalline ribbing so mature specimens resemble detailed mineral micrographs instead of simple branching wireframes.
- Add a structure-only grayscale comparison tool to force silhouette quality.
- Make grain collision boundaries and growth fronts visibly inspectable.
- Offer separate low-density / fine-dendrite / mineral-forest morphologies with different mathematical rules, not merely color presets.
- Improve finish rendering only **after** shape complexity and control range passes visual review.
- Test performance on iPhone Safari at sustained growth rates before raising grid resolution.

## Local use
- Open `standalone.html` in an HTML viewer (fully inline; no external dependencies).
- Or serve `index.html`, `styles.css` and `src/` from a local static file server.
- Run `npm test` for the engine checks.
- Never interpret a GitHub HTML file preview as a live running application; GitHub Pages or another static host must be explicitly enabled for a shared live link.
