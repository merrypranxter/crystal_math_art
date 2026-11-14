# CRYSTALLIZATION APOCALYPSE
### A living laboratory for impossible crystalline matter

A mathematical growth-art studio. Plant competing crystal colonies, melt and regrow material, grow advancing dendritic tips or diffusion-coupled crystalline fronts, and finish their structure with color and surface effects.

**Latest playable build: Phase A.4 — Actual Crystal Physics.** Three distinct growth systems coexist, including a numerical phase-field PDE experiment. This is not a scientifically calibrated crystallization simulator.

## A.4 — Phase Field laboratory

**New:** an independently evolving continuous solid/liquid fraction field, solving a simplified Allen–Cahn-like reaction-diffusion PDE. Fourfold, sixfold and experimental eightfold symmetry are selectable for *newly planted* crystal grains. New controls alter supersaturation, orientation stiffness and interface mobility; other crystals remain intact. A sixfold phase grain is present in the default sample. A nine-point Laplacian reduces square-grid artifacts, and Wolfram validated the orientation surface-stiffness expression and safe parameter bounds.

**Important scope:** this is an honest PDE-inspired phase-field experiment, **not** an accurate thermodynamic solidification simulation, true 3D facets or a complete anisotropic free-energy variational model. The new phase grains are currently relatively compact shapes, not mature branching dendrites. See [A.4 details and limitations](docs/PROTOTYPE_A4.md).

## Play / development

- [Standalone HTML](standalone.html) — a complete offline browser/HTML-viewer build, no external scripts, server, subscription or secret keys needed.
- Modular source runs from a folder with `python3 -m http.server 8080` or `npm run serve`. The JavaScript modules and CSS live in `src/` and `styles.css`.
- `npm test` — 28 Node tests for growth-state persistence, deterministic reproduction, melting, regrowth, morphology identity, front deposition, and undo.
- `python3 scripts/build_standalone.py` — reassemble the dependency-free single HTML file from the current modular sources.
- **No Netlify deployment is requested or triggered by the repository.**

## Ten growth personalities across three engines

**Branching tip engine (A.1–A.2)**

1. Sixfold Cathedral — ordered branching dendrites.
2. Feathered Frost — bilateral frost needle structures.
3. Eight-axis Starburst — radially locked crystallization.
4. Wild Crystal — drifting asymmetric, branching crystals.

**Diffusion-coupled cellular front engine (A.3)**

5. Fourfold Facet Fans — fourfold kinetic attachment with fan-shaped crystalline branches.
6. Sixfold Skeletal Fingers — slender angular competing fronts.
7. Mutant Accretion Coral — irregular, diffusion-fed, finger-like interface deposition.

**Continuous phase field (A.4)**

8. Fourfold Phase — a continuous solid fraction with fourfold interface stiffness.
9. Sixfold Phase — an oriented compact freezing front with sixfold symmetry.
10. Eightfold Experimental Phase — a deliberately non-crystallographic angular experiment.

The engines are structurally different: the first grows **tips and daughter branches**, the second attaches **discrete cells** to a nutrient-fed interface, and the third **integrates a PDE for a continuous phase fraction**. Each colony remembers its growth family. The phase-field equation and limitations are described in the A.4 notes.

## Artist controls

- **Touch:** PLANT adds a colony with the currently selected anatomy; MELT removes material in a brush radius, creating a heated area and surviving regrowth edges; FEED restores dissolved material.
- **Growth:** select the future colony anatomy, then use only the relevant controls for that growth family. Current crystals never change morphology when a different seed type is selected.
- **Environment:** diffusion, supply, heat/brush radius.
- **Finishes:** five palettes and three decorative treatments. Changing finish never erases material history.
- **Studio:** pause, step, undo, guarded New Composition, measurements and 2400 × 2400 PNG export.

## Science and limitations

- Real evolving **state**: occupied material, nutrient field, heated zones, per-grain identity and deterministic simulation RNG.
- The four-neighbor concentration diffusion is bounded by a 0.24 parameter max to preserve a nonnegative explicit stencil; Wolfram checked its 0 ≤ d ≤ 0.25 convexity range.
- A.3's nutrient-gradient proxy, orientation lock, and weighted growth tournament are **physics-inspired approximations**, not solved harmonic measure or true hopper facet kinetics. A.4 adds a genuine evolving phase-field PDE approximation, but it is neither the full anisotropic variational solver nor a complete thermodynamic solidification model.
- The display is still a 2D structural renderer. True Bismuth Necropolis terraces, sectioned growth memory, birefringence and volumetric optics are still work ahead.
- Performance will need profiling on real iPhone Safari before releasing heavy multi-crystal works.

## Project documents

- [A.4 phase-field research prototype](docs/PROTOTYPE_A4.md)
- [A.3 implementation and caveats](docs/PROTOTYPE_A3.md)
- [A.2 morphology engine](docs/PROTOTYPE_A2.md)
- [A.1 implementation](docs/PROTOTYPE_A1.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Research notebook](docs/RESEARCH.md)
- [Wolfram math integration](docs/WOLFRAM_CRYSTAL_MATH.md)

## Creative standards

Wildly detailed growth and sharp forms first. Color and optical effects should amplify the structure, not hide mediocre geometry with generic sparkle or bloom. No secret keys in JavaScript or GitHub, no surprise resets, and no expensive deployment just to iterate.
