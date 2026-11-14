# CRYSTALLIZATION APOCALYPSE
### A living laboratory for impossible crystalline matter

A mathematical growth-art studio. Plant competing crystal colonies, melt and regrow material, grow advancing dendritic tips or diffusion-coupled crystalline fronts, and finish their structure with color and surface effects.

**Latest playable build: Phase A.3 — Crystal Anatomy Gone Wrong.** This is still a physics-inspired art prototype, not a scientifically calibrated crystallization simulator.

## Play / development

- [Standalone HTML](standalone.html) — a complete offline browser/HTML-viewer build, no external scripts, server, subscription or secret keys needed.
- Modular source runs from a folder with `python3 -m http.server 8080` or `npm run serve`. The JavaScript modules and CSS live in `src/` and `styles.css`.
- `npm test` — twenty Node tests for growth-state persistence, deterministic reproduction, melting, regrowth, morphology identity, front deposition, and undo.
- `python3 scripts/build_standalone.py` — reassemble the dependency-free single HTML file from the current modular sources.
- **No Netlify deployment is requested or triggered by the repository.**

## Seven genuine growth personalities

**Branching tip engine (A.1–A.2)**

1. Sixfold Cathedral — ordered branching dendrites.
2. Feathered Frost — bilateral frost needle structures.
3. Eight-axis Starburst — radially locked crystallization.
4. Wild Crystal — drifting asymmetric, branching crystals.

**Diffusion-coupled cellular front engine (A.3)**

5. Fourfold Facet Fans — fourfold kinetic attachment with fan-shaped crystalline branches.
6. Sixfold Skeletal Fingers — slender angular competing fronts.
7. Mutant Accretion Coral — irregular, diffusion-fed, finger-like interface deposition.

The two engines are structurally different: the first grows **tips and daughter branches**, the second attaches **solid cells along a persistent liquid-solid interface** by selecting nutrient-fed front sites with an orientation and screening heuristic. Each colony remembers its anatomy. The new front engine is not the full phase-field solver yet.

## Artist controls

- **Touch:** PLANT adds a colony with the currently selected anatomy; MELT removes material in a brush radius, creating a heated area and surviving regrowth edges; FEED restores dissolved material.
- **Growth:** select the future colony anatomy, then use only the relevant controls for that growth family. Current crystals never change morphology when a different seed type is selected.
- **Environment:** diffusion, supply, heat/brush radius.
- **Finishes:** five palettes and three decorative treatments. Changing finish never erases material history.
- **Studio:** pause, step, undo, guarded New Composition, measurements and 2400 × 2400 PNG export.

## Science and limitations

- Real evolving **state**: occupied material, nutrient field, heated zones, per-grain identity and deterministic simulation RNG.
- The four-neighbor concentration diffusion is bounded by a 0.24 parameter max to preserve a nonnegative explicit stencil; Wolfram checked its 0 ≤ d ≤ 0.25 convexity range.
- A.3's nutrient-gradient proxy, orientation lock, and weighted growth tournament are **physics-inspired approximations**, not a solved harmonic measure, continuous phase-field PDE, true hopper facet kinetics, or fully three-dimensional crystal growth.
- The display is still a 2D structural renderer. True Bismuth Necropolis terraces, sectioned growth memory, birefringence and volumetric optics are still work ahead.
- Performance will need profiling on real iPhone Safari before releasing heavy multi-crystal works.

## Project documents

- [A.3 implementation and caveats](docs/PROTOTYPE_A3.md)
- [A.2 morphology engine](docs/PROTOTYPE_A2.md)
- [A.1 implementation](docs/PROTOTYPE_A1.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Research notebook](docs/RESEARCH.md)
- [Wolfram math integration](docs/WOLFRAM_CRYSTAL_MATH.md)

## Creative standards

Wildly detailed growth and sharp forms first. Color and optical effects should amplify the structure, not hide mediocre geometry with generic sparkle or bloom. No secret keys in JavaScript or GitHub, no surprise resets, and no expensive deployment just to iterate.
