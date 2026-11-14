# A.14 — The Crystal Breeding Chamber

## What is working

A new **BREEDING** inspector tab captures three independent parent DNA samples. Each sample can come from an archetype or from the actual occupied voxels of a grown volume crystal. The captured data includes per-law gene frequency, the circular mean orientation of each kinetic gene, voxel count, and a coarse exposed-surface roughness indicator.

Weights A / B / C blend all three parents. Gene frequency interpolation is weighted; for each growth law, directions are mixed by circular mean. The resulting recipe includes user-controlled deterministic crossover and mutation. The preview displays the actual normalized offspring gene frequencies.

**PLANT 3-PARENT CHILD** creates a new independent 3D colony, implants a spatially distributed mosaic of inherited growth laws into the existing mineral cells, and stores its recipe in the volume field. The cell attachment competition from A.13 continues to inherit the parent voxel's kinetic law; A.14 optionally recombines the genome at newly deposited sites to keep minority parents active. The laws affect the weight of candidate growth front attachment, and consequently the 3D solid geometry. It is not an image filter.

The offspring's recipe and voxel state participate in snapshot / Undo, restoring exact deterministic growth. Parent samples remain held in the artist's three captured slots through Refresh and Restart, but are not stored persistently across closing the app. A portable recipe can be downloaded as JSON and reimported into Parent A.

## Workflow

1. Open BREEDING. Start with archetype parents A (Needle Star), B (Octahedral), C (Cavern Coral), or use MUTATION > PLANT 3D SPECIMEN and let a real grain grow.
2. Select a growing volume grain under **sample source** and choose CAPTURE A/B/C. Each capture freezes its observed phenotype, so future growth does not overwrite the sample.
3. Set relative contributions and the crossover / mutation controls. These are normalized when the recipe is built.
4. Press RECOMBINE DNA for a new preview; this does not change any material.
5. Press PLANT 3-PARENT CHILD. A new volume grain nucleates at the best of 35 open candidate positions; the existing artwork remains intact.
6. Let it grow, capture its new mixed phenotype into another parent slot, and continue breeding through generations. Undo restores implanted genes, orientations, lineages, seed RNG and the world state.

## Implementation details

- `src/breeding.js`: independent phenotype capture, normalized 3-parent blending, deterministic seeds, portable JSON recipes, and offspring placement
- `src/volume.js`: `hybrids` map indexed by grain ID; `imprintHybrid` spatially distributes parental genes through the embryo; `deposit` adds sparse recombination / mutation to the inherited gene when a new voxel is actually attached
- `src/main.js`: artist controls, source dropdowns, live profile bars, parent sample cards, import/export, status, undo sequence
- `tests/breeding.test.mjs`: genuine phenotype capture, all three embryo laws, persistent inherited front growth, deterministic growth, snapshot restoration, and **different solid occupancy when parents differ**

## Quality gates

- Current legacy regressions: 110 cases (prior A.13 baseline)
- New A.14 breeding test cases: 10
- New test total: **120**
- Desktop and phone-sized browser checks: capture/plant/grow/restart/undo; browser JS error count = zero
- Real iPhone Safari WebGL2 hardware rendering has not been verified; 2D CPU preview remains available.

## Scientific integrity

Gene, crossover, and mutation describe **procedural crystal growth rules**, not literal DNA or valid laboratory mineral breeding. Each voxel has one winning kinetic law and orientation; there is no molecular genome or alloy thermodynamic model. Roughness is a measured silhouette statistic in the captured sample, but is not yet an independently propagated growth coefficient. The hybrid model is a nutrient-coupled voxel growth competition; it is not atomistic crystallography or a calibrated 3D phase-field PDE.

## Preservation

The 194-entry canonical MATHEMAGICAL vault is sourced from the previous GitHub `src/palette-vault.js` verbatim; five crystal-specific palettes make 199. Changing the palette, shuffling stops, and altering material illumination never modifies offspring genetic state.

No Netlify deployment or server-side processing is required.
