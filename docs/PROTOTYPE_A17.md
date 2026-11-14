# Phase A.17 — Evolutionary Ecosystems

## What this release actually does

The new **ECOSYSTEM** tab starts three heritable 3D mineral bloodlines in ONE 172x172 world, each occupying the same 3D volume and sharing its single volume nutrient array and frontier ownership. A real 26-neighbor candidate tournament permits multiple lineages to contest an unoccupied cell; once one deposits matter, the others cannot overwrite that cell. Diffusion and nutrient consumption couple all three. A separate isometric view renders exposed simulation voxels with the chosen MATHEMAGICAL palette.

The three founding genomes are taken from the **BREEDING** tab at the time the habitat starts. The experiment does not mutate the live artwork unless the artist deliberately selects **PLANT SURVIVOR**.

## Controls

- **NEW SHARED HABITAT**: reseed a reproducible three-lineage experiment using current breeding parents and the scarcity setting.
- **ADVANCE SEASON**: advance 12–96 more real 3D growth steps in the same habitat; no reset and no rerender-only gimmick.
- **SHARED NUTRIENT SCARCITY**: lower starting solute and slower recovery under high scarcity. The 3D diffusion stencil remains bounded to <=1/6.
- **EVOLVE SURVIVORS**: capture the three actual surviving voxel phenotypes, weight their contributions by grown mass *and exposed legal frontier opportunities*, recombine three descendant recipes, then start the next-generation habitat. At least two bloodlines must survive.
- **PARENT A/B/C**: move any surviving grown phenotype into an existing breeding parent slot, without changing artwork.
- **PLANT SURVIVOR**: intentionally install a grown lineage's genotype in the live world; the action remains undoable.
- **EXPORT ECOLOGY REPORT**: user-initiated JSON containing genealogy, recipes, measured counts, contacts, competition and seasonal history. It excludes heavy raw voxel arrays. This is a report, not a restorable simulation checkpoint.

## What the measurements mean

- **Occupied voxels** are real current 3D material, identified by lineage owner 1–3.
- **Real contact faces** count 6-connected physical adjacency between different owner grains, once per positive axis.
- **Contested frontiers** count currently unoccupied 3D sites listed for attachment by at least two owners.
- **Open fronts** count potential attachment sites per lineage, including contested sites.
- **Starved space** is the fraction of currently empty interior voxels with concentration below 0.3.
- **Next-generation weights** favor living voxel mass and exposed open-front opportunity. They intentionally preserve multiple lineages through three-parent recombination; this is evolutionary-inspired procedural art, not biological selection or calibrated mineral chemistry.

### Science & engineering limitations

The solver is an existing physics-inspired discrete stochastic 3D growth system, not a real thermodynamic solidification PDE, rigorous Laplace field DLA, or physical competition ecology. A fair round-robin growth budget can keep early colony voxel counts similar; later resource limitation and collisions distinguish their realized growth. The habitat is deliberately bounded (the 172-size sandbox yields a volume resolution around 22^3), with a limited step count to preserve iPhone performance. The isometric voxel gallery works offline in Canvas 2D, independent of WebGL2. The actual iPhone Safari GPU path remains untested in this development environment.

### Preservation

All prior A.1–A.16 systems, New Seed / Refresh / Restart, Undo, Nursery, Selection and Breeding remain available. The **canonical 194 MATHEMAGICAL palette vault and five studio palettes** are kept unmodified. The standalone builder includes `src/ecosystem.js` in dependency order and needs no network or CDN.

Run the full tests with `npm test` / `node --test tests/*.test.mjs` and rebuild standalone with `python3 scripts/build_standalone.py`.
