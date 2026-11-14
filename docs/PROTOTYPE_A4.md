# Phase A.4 — Actual Crystal Physics: phase-field experiment

**Status:** implemented and tested as a browser-run 2D educational/artistic phase-field prototype. **Not** a calibrated physical crystallization, 3D crystal, or full anisotropic free-energy solver. Verified by Node tests and headless Chromium DOM/touch checks; specific iPhone Safari performance has not yet been measured.

## What is actually new

- `src/phase.js` introduces **PhaseField**, a third independent growth family. Earlier A.1/A.2 branching tips and A.3 stochastic attachment fronts remain present, with their material histories intact.
- A coarse-resolution **continuous solid fraction** field `phi` evolves by an explicit time-stepping finite-difference PDE, alongside a coupled but approximate dissolved-solute field from `CrystalWorld`. The phase/solid interface advances through the grid, not a precomputed path.
- Fourfold, sixfold, and experimental eightfold angular symmetry use an orientation-dependent positive **surface-stiffness factor** derived from a simplified anisotropic surface-energy law; eightfold is an artistic numerical experiment, not an ordinary periodic crystal lattice.
- Positive changes to the solid fraction consume nutrient. Cells beyond the solid threshold mark persistent occupancy in the same world as the old growth engines. Other grain IDs become blocking material; phase fields retain their grain identity.
- Thermal brush destroys local phase fractions; neighboring surviving fields can grow into the wound after cooling. Snapshot/restore includes phase, grain identity and the shared resource field.
- New phase controls: **supersaturation/driving**, **orientation stiffness**, and **interface mobility**. They affect future growth; none replaces existing crystal history.
- Visual display draws smooth scaled phase fractions with boundary lighting, with stylistic materials explicitly separate from the underlying physics.

## The numerical model — honest scope

With `p` the solid fraction and `c` the local nutrient concentration:

    dp/dt = mobility * ( kappa(theta) * Laplacian(p)
                            - 2 * barrier * p * (1-p) * (1-2p)
                            + 6 * drive * c * p * (1-p) )
             - thermal_melting * heat * p

This is an **Allen–Cahn-like reaction/diffusion solidification model** with a double-well reaction and nutrient driving. Numerically, `Laplacian(p)` uses a more directionally balanced nine-point stencil rather than the older five-point stencil, reducing accidental square-grid artifacts. The normal direction for angular terms comes from a Sobel-like gradient of the evolving field.

Our `kappa(theta)` is a local coefficient based on the orientation stiffness `1-(n²-1)*epsilon*cos(n*theta)`, where `epsilon=.92*slider/(n²-1)`, bounded by `0.92` relative to the critical stiffness threshold. That keeps the coefficient in `[0.08, 1.92]` when the slider is at its maximum. A Wolfram Language calculation verified the surface-stiffness formula for `gamma(theta) = 1 + epsilon*cos(n*theta)` and the associated bound. **Important:** placing orientation stiffness directly in a Laplacian coefficient is an approximation, not a full variational anisotropic phase-field equation. Genuine strong faceting/missing orientation behavior requires additional numerical treatment.

The model uses explicit time step `dt=0.42`, `diffusion coefficient=0.18`, and mobility <=1. With the stencil's central coefficient magnitude `20/6`, even the maximum oriented diffusion weight `0.42*0.18*1.92≈0.145` is below the four-neighbor conservative limit `0.25`; the nine-point stencil is no more restrictive in this case. The nonlinear reactions remain bounded by clamping `p` to `[0,1]`. This is a numerical guard, **not** a proof that all coupled dynamics are quantitatively physical.

### Intentional limitations

- The model is **2D**, solved at approximately half the master scene's resolution and smoothly scaled for display and export. No actual 3D mineral faceting, optically correct birefringence or thermodynamic parameter calibration yet.
- Solute is shared with the artistic earlier engines. While positive phase growth consumes solute, the material field remains a simplified reservoir/diffusion model, not a fully mass-conserving physical solute-solidification model.
- This first proof primarily creates distinct compact/faceted fronts, not spectacular dendrite instabilities yet. For genuine fine dendrites, test a conserved two-field model with thermal/solute diffusion length scales, small noise and anisotropic interface kinetics separately.
- The simulation runs on the CPU in JavaScript for portability. A future GPU ping-pong texture version may support higher resolution on compatible devices.
- Art finishes are stylized; a physical optical layer belongs later.

## Controls & interaction

Choose any option under **A.4 ACTUAL PHASE-FIELD PDE** in the morphology dropdown, then tap the canvas to plant that grain. The initial sample composition also contains a sixfold phase grain among the three older branching species.

Switching growth families does not mutate existing crystals. Use MELT or FEED on the artwork to change conditions. `UNDO` restores the most recent gesture, including the phase state. `NEW COMPOSITION` still requires a confirmation. The standalone HTML opens with no server, paid API or CDN. Wolfram was used only as a **development-side numerical assistant**, and no secret API key is present in the app.

## Validation performed

- Node 22: **28 automated tests passing** across all three engines, including new boundedness, numerical stability guards, determinism, zero mobility, melt/regrowth, undo, coexistence and separate morphology changes.
- Chromium via injected standalone document: page initialized without JavaScript errors and rendered four colonies including a phase field.
- Mobile-sized Chromium with touch events: select phase mode, plant a seed, melt material, undo, and switch the correct controls. No JS page errors recorded.
- Exact real-device iOS Safari testing remains to do before declaring mobile performance verified.

## Next science/art goals

- **A.5 Instability Garden** — conserved nutrient/temperature with genuine tip-splitting conditions, multiple coupled phase fronts, and micro-branching rather than a single compact shape.
- **A.6 Mineral Optics** — renderer reads thickness, orientation and real surface gradients; layer thin-film interference, birefringence-inspired colors, cracks and translucency under artist control.
- **Bismuth Necropolis** remains a separate faceted terrace growth geometry engine, not a preset of this phase solver.

No Netlify deployment triggered.
