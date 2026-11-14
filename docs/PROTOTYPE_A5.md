# A.5 — INSTABILITY GARDEN

Date: 2026-11-13
Status: implemented physics-inspired interactive experiment; NOT a calibrated physical dendritic solidification solver.

## What changed

A.4 provided a continuous solid-fraction field `phi` with a double-well reaction, positive orientation-dependent local stiffness, diffusion, driving force, and heat. A.5 keeps that integration but introduces two new *coupled* instabilities:

1. **Liquid-facing nutrient bias + quenched heterogeneity.** At cells on a moving phase boundary, the solver samples dissolved material ahead along the exterior interface normal. A deterministic, spatially correlated material-noise field (seeded once from the composition) modulates attachment driving. Increasing instability weakens the smoothing term and reduces bulk attachment in favor of selective front advancement. These changes act on the simulation field, not the renderer.
2. **Persistent interfacial protrusion leaders.** Each phase grain with instability enabled initializes leaders from its current solid/liquid boundary. Leaders consume dissolved resources, steer using the fixed disorder field, split according to the branch-scale control, and deposit actual solid phase fraction into the *same* phase grid. The PDE continues to thicken, smooth, or melt this deposited material. Surviving material can continue evolving; these protrusions are NOT simply drawn antialiased lines.

This is an artistic hybrid growth mechanism, with separately modeled tips driving perturbations in the phase boundary. Do NOT describe it as a derivation, integration or validation of the full Mullins–Sekerka moving-interface problem, a full thermodynamic two-field formulation, latent heat simulation, or a microstructural phase-field-crystal model.

## User controls

In GROWTH, choose one of **Fourfold Phase, Sixfold Phase or Experimental Eightfold Phase** to see its relevant controls:
- `phaseDrive` — supersaturation / overall solidification driving.
- `phaseStiffness` — bounded positive local anisotropic stiffness (A.4 simplification).
- `phaseMobility` — how fast both the phase fraction and new protrusions evolve; zero freezes both.
- `phaseInstability` — 0 reproduces compact A.4-style growth; higher values amplify exposed advancing fingers and splitting.
- `phaseWavelength` — larger value means finer branching scale, shorter characteristic spacing, smaller correlated material-scale patches.
- `phaseCapillarity` — stronger smoothing suppresses tiny jagged features; lower smoothing favors high-frequency branches.

Changing controls affects **future material development** and does NOT overwrite existing artworks or colors. Switching `morphology` only affects new seeds; existing grain identities remain.

## Important robustness work

- Introduced `seedValue` as immutable material/disorder seed separate from the changing RNG state. Fixes a bug where material heterogeneity would otherwise change when random-number calls occurred.
- Changing instability from zero to nonzero after growth begins discovers the **existing live boundary** and starts protrusions there, rather than drawing lines from a buried core.
- Maximum 128 active phase leaders; finite length cap based on grid size and instability to protect mobile devices.
- Melting removes nearby persistent phase leaders and solid fraction; snapshot/undo captures leader coordinates, branching history, quenched seed and phase fields.
- Existing three growth engines are still separate. Renderer uses the existing complete color lookup system and is independent of the material update.
- WebGL2 is *not* required for this A.5 CPU prototype; actual iPhone performance remains unverified and may require lower resolution or WebGPU later.

## Reproduction / validation

- `npm test`: **39 Node model tests passed** including seven new tests for instability comparison, persistent tips, determinism, zero instability baseline, freeze, melt/undo, numerical bounds and hard active-leader limits.
- Local desktop and 390px mobile Chromium smoke tests: new controls visible, phase branches grown, NEW SEED, undo/confirmation modal and palette controls work without observed JavaScript page errors.
- The local browser fixture used three representative MATHEMAGICAL palettes (plus five studio colors). The canonical **194-entry MATHEMAGICAL vault remains in the GitHub repository** and must be inlined in the final standalone from that canonical data; verify 199 in the committed build.
- No Netlify deployment and no private API keys.

## Science references / inspiration

- Mullins–Sekerka-instability-based analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC18437/
- Phase-field anisotropy and cellular/dendritic patterns: https://www.mdpi.com/2075-4701/13/12/1916

## What's next

- Stop overbuilding the PDE before visual depth: focus on high-quality facet normals, phase relief and optically grounded coloration that responds to orientation and growth history.
- Later investigate an honest two-field diffusion/latent-heat PDE and compare numerical predictions, including convergence tests, against Wolfram or reference solvers.
