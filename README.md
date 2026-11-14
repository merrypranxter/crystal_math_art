# CRYSTALLIZATION APOCALYPSE
### A living laboratory for impossible crystalline matter

A mathematical growth-art studio. Plant competing crystal colonies, melt and regrow material, grow advancing dendritic tips or diffusion-coupled crystalline fronts, and finish their structure with color and surface effects.

**Latest playable build: Phase A.10 — CRYSTAL BODIES.** Four independently evolving crystal engines now coexist: tip dendrites, nutrient-driven cellular fronts, phase-field material and radial spherulite colonies with saved local optical orientation. All 199 original palettes are preserved.



## A.10 — Crystal Bodies (new)

**BODY 3D** is an optional WebGL2 layer that builds a genuine triangle mesh from existing occupied crystal cells across **all four growth engines**. It adds raised ridge geometry, exposed side walls, underside faces, directional lighting, history-derived internal bands, adjustable thickness/translucency and a RGB spectral surface shader. Select **ORBIT 3D** to drag the camera and pinch to zoom; camera changes do not alter any actual growth state. Toggle back to the 2D original at any time. The renderer automatically restores the 2D view if the GPU path cannot initialize. The 2400×2400 PNG button now renders the active 3D view when enabled.

All **199 palettes** remain available (the canonical 194-entry vault with every original stop plus five crystal palettes). The WebGL mesh receives the SAME palette interpolation LUT as the existing renderers, so the source vault is never duplicated or truncated. Offline standalone, no external three.js/React imports or API keys. A.10 is an **extrusion of 2D simulation matter**, not a genuinely 3D growing phase-field solver or physically accurate ray-traced refraction. [Technical details](docs/PROTOTYPE_A10.md).

## A.8 — CHROMATIC HERESY / competing radial crystals

- Plant **Spherulite Radial Silk**, **Rosette Concentric Spectrum**, or **Astral Spherulite Faceted Fans**. These are independent growing crystal types with genuinely different discrete morphology from the existing phase-field PDE or tip fronts.
- Record each deposited cell's **radial fibril direction**, growth phase, age and grain ownership. When two grains meet, a persistent contact seam forms rather than one colony overwriting the other.
- Growth sliders: accretion speed, ring rhythm and spiral disorder. The POLARIZED HERESY finish adds analyzer angle, color order and crossed-polarizer contrast without mutating the artwork.
- **199 palettes** = 194 unmodified MATHEMAGICAL vault recipes plus 5 crystal palettes. Search, edit, shuffle, restore, and randomize remain; 12-color palettes retain all stops.
- **New Seed / Refresh / Restart / Undo** all preserved. Standalone HTML remains self-contained with no external CDN or API.
- Full detail: [A.8 technical notes](docs/PROTOTYPE_A8.md).

## A.6 — Mineral Flesh (material laboratory)

- **Four new art finishes**: Mineral Relief, Stratified Ghost, Prismatic Oxide and Obsidian, alongside classic Etched Frost, Cold Glass and Dark Metal.
- **Relief derived from geometry**: a two-pass chamfer distance transform calculates the thickness of each phase-field crystal body from the real solid/liquid interface. Grain orientations quantize the optical normals into coherent angular facets.
- **Crystallization archaeology**: every phase cell stores its **first solidification tick**. Banding follows those timestamps, not arbitrary screen coordinates. Melting removes local age data; regrowth forms a new layer; undo restores past layers exactly.
- **Four material controls**: relief, age-banding, light direction and spectral separation. They change the material without changing growth; extra controls appear only for new finishes.
- **All 199 palettes preserved** in the canonical GitHub source and standalone; restart/new seed/refresh untouched.
- **No real 3D geometry, measured birefringence, or calibrated thin-film optics claimed.** This is a 2.5D, morphology-based artistic renderer. Browser-only and no external API or Netlify needed.
- **45 local automated tests**, including 6 new material/age tests; desktop + mobile browser smoke checks.

[Details, implementation and limitations](docs/PROTOTYPE_A6.md)

## A.5 — Instability Garden (new)

- Phase-field crystals can grow branching material fingers from their current solid/liquid boundary. An Allen–Cahn-like PDE continues to advance and thicken the deposited phase.
- **Front instability** balances diffuse compact growth against persistent, resource-screened protrusions. **Branch scale** controls spatial heterogeneity and how frequently fingers split. **Surface smoothing** controls capillary regularization. Zero instability restores the A.4 compact front without assisted tips.
- Enabling instability *after* a crystal has grown plants leaders at the actual existing interface; no hidden reset or second prefab artwork.
- The inherited A.4 PDE controls (supersaturation, surface stiffness, interface mobility), `NEW SEED`, `REFRESH`, `RESTART`, `UNDO`, 199 palettes and color-stop editing remain.
- This is **not** an exact Mullins–Sekerka solver: the fingers are a deliberately explicit growth-front assistance mechanism coupled to real phase-state material, not a physically calibrated free-boundary model. [A.5 implementation and limitations](docs/PROTOTYPE_A5.md).

## A.7 — Crystal Archaeology & Fracture Gardens

- **◇ FRACTURE:** drag directly over a phase-field crystal to physically remove crystal cells, creating persistent jagged excavations and optional side fractures. Earlier tip and discrete-front engines are not yet fractured by this tool.
- **ARCHIVE tab:** fracture width, splintering, recrystallization rate, and layer-reveal intensity are grouped together. Zero crack healing keeps an open fissure; nonzero healing permits the phase-field interface to refill it from nearby material.
- **CRYSTAL ARCHAEOLOGY material:** appearance-only visualization of old solidification timestamps, retained fossil growth, and regrown cell generations; all 199 palettes remain available.
- **History-aware physics:** first deposition, excavation, and subsequent deposition have distinct timestamp and generation records. Undo restores the entire set.

Run `npm test` to check the existing A.1–A.6 tests and the new A.7 history/fracture tests. Details: [docs/PROTOTYPE_A7.md](docs/PROTOTYPE_A7.md).

## A.4 — Phase Field laboratory

**New:** an independently evolving continuous solid/liquid fraction field, solving a simplified Allen–Cahn-like reaction-diffusion PDE. Fourfold, sixfold and experimental eightfold symmetry are selectable for *newly planted* crystal grains. New controls alter supersaturation, orientation stiffness and interface mobility; other crystals remain intact. A sixfold phase grain is present in the default sample. A nine-point Laplacian reduces square-grid artifacts, and Wolfram validated the orientation surface-stiffness expression and safe parameter bounds.

**Important scope:** the A.4 PDE can be run as a relatively compact phase-growth baseline by setting A.5 instability to 0. A.5 adds deliberately heuristic branching front assistance rather than claiming a full thermodynamic model. See [A.4 details and limitations](docs/PROTOTYPE_A4.md).

## A.9 — Optical Heresy (new)

**New:** a spectral optical material treatment for the radial crystal family, backed by a standalone **WebGL2 GLSL shader** with a pure Canvas 2D fallback, plus a reversible **TWIST LIGHT** paint tool. The shader combines the stored fiber-director field, per-grain ring coordinate, three wavelength-dependent interference signals, grain-boundary markings and the original palette color stops. Optical painting changes the director field only, not the crystal occupancy or other growth laws. New controls: prismatic RGB separation, defect highlights, twist strength, and automatic/GPU/Canvas renderer choice. This is *artistically inspired*, not calibrated birefringence. Full notes: [docs/PROTOTYPE_A9.md](docs/PROTOTYPE_A9.md).

**Palettes:** the published GitHub version must preserve **all 194** original MATHEMAGICAL vault palettes plus **five** studio palettes (199 total). Original stop lists, palette search, editing/shuffle and Restore Original remain intact. The development folder may use a small vault fixture; never commit that fixture to GitHub.

## Play / development

- [Standalone HTML](standalone.html) — a complete offline browser/HTML-viewer build, no external scripts, server, subscription or secret keys needed.
- Modular source runs from a folder with `python3 -m http.server 8080` or `npm run serve`. The JavaScript modules and CSS live in `src/` and `styles.css`.
- `npm test` — 79 Node tests for growth-state persistence, deterministic reproduction, melting, regrowth, morphology identity, front deposition, and undo.
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

**Continuous phase field with A.5 instability growth**

8. Fourfold Phase — a continuous solid fraction with fourfold interface stiffness.
9. Sixfold Phase — an oriented compact freezing front with sixfold symmetry.
10. Eightfold Experimental Phase — a deliberately non-crystallographic angular experiment.

The engines are structurally different: the first grows **tips and daughter branches**, the second attaches **discrete cells** to a nutrient-fed interface, and the third **integrates a PDE for a continuous phase fraction, optionally assisted by living protrusion fronts**. Each colony remembers its growth family. The phase-field equation and limitations are described in the A.4 notes.

## Artist controls

- **Touch:** PLANT adds a colony with the currently selected anatomy; MELT removes material in a brush radius, creating a heated area and surviving regrowth edges; FEED restores dissolved material.
- **Growth:** select the future colony anatomy, then use only the relevant controls for that growth family. Current crystals never change morphology when a different seed type is selected.
- **Environment:** diffusion, supply, heat/brush radius.
- **Finishes:** 199 palettes (194 preserved MATHEMAGICAL recipes plus five Crystal Studio originals), searchable and editable color stops; three surface treatments. Changing finish never erases material history.
- **Studio:** pause, step, undo, NEW SEED, confirmed REFRESH and RESTART, growth measurements, and 2400 × 2400 PNG export.

## Science and limitations

- Real evolving **state**: occupied material, nutrient field, heated zones, per-grain identity and deterministic simulation RNG.
- The four-neighbor concentration diffusion is bounded by a 0.24 parameter max to preserve a nonnegative explicit stencil; Wolfram checked its 0 ≤ d ≤ 0.25 convexity range.
- A.3's nutrient-gradient proxy, orientation lock, and weighted growth tournament are **physics-inspired approximations**, not solved harmonic measure or true hopper facet kinetics. A.4 adds a genuine evolving phase-field PDE approximation, but it is neither the full anisotropic variational solver nor a complete thermodynamic solidification model.
- The 2D simulation now also feeds an optional triangulated 3D extrusion view. True intrinsic 3D crystallization, refractive ray tracing, and physically calibrated birefringence are still future work.
- Performance will need profiling on real iPhone Safari before releasing heavy multi-crystal works.

## Project documents

- [A.5 Instability Garden](docs/PROTOTYPE_A5.md)
- [A.4.1 palettes and seed controls](docs/A4_1_PALETTES_AND_SEEDS.md)

- [A.4 phase-field research prototype](docs/PROTOTYPE_A4.md)
- [A.3 implementation and caveats](docs/PROTOTYPE_A3.md)
- [A.2 morphology engine](docs/PROTOTYPE_A2.md)
- [A.1 implementation](docs/PROTOTYPE_A1.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Research notebook](docs/RESEARCH.md)
- [Wolfram math integration](docs/WOLFRAM_CRYSTAL_MATH.md)

## Creative standards

Wildly detailed growth and sharp forms first. Color and optical effects should amplify the structure, not hide mediocre geometry with generic sparkle or bloom. No secret keys in JavaScript or GitHub, no surprise resets, and no expensive deployment just to iterate.
