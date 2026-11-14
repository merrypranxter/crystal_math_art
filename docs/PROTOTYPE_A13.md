# A.13 — MINERAL MUTATION CHAMBER

**Scope:** Heritable procedural growth-law changes inside *existing* 3D crystal material; multiple laws can compete within one named mineral grain. No new services, packages, API calls, or shader-only deception. A.12's 3D shape, chemistry, fractures, and UI remain.

## 1. Inheritable crystal 'DNA' means growth kinetics, not biological genetics

Each currently solid voxel in `src/volume.js` stores:

| Buffer | Data | Semantics |
|---|---|---|
| `owner: Uint8Array` | original grain ID | Never overwritten by a genetic mutation |
| `gene: Uint8Array` | 1 needle, 2 octahedral, 3 coral | **Local growth-law identity** |
| `geneAngle: Float32Array` | local axis rotation | **Heritable preferred orientation** |
| `lineage: Uint32Array` | mutation gesture ID, 0 if pristine | **Heritable mutation lineage** |
| `birth: Uint32Array` | original solidification tick | Unchanged when a genetic mutation edits only its law |

At new deposition, the cell samples its already-grown 26 neighboring parents of the *same grain*. The `growthParent` scoring function evaluates each candidate parent's law, its orientation, 3D directional axis/diagonal alignment, adjacency, and deterministic small heterogeneity. A new occupied voxel inherits the winning local parent's **gene, orientation and lineage**; this mechanism makes mixing persistent and causes newly added mineral to use one of the competing **actual growth kinetics**. All attachment candidates still compete for the same **diffusing nutrient** and the same occupancy. The old grain identity survives.

Important: This is a deterministic, artist-directed kinetic growth rule on a lattice, NOT a genetic algorithm with chromosomes, biological DNA, atomistic crystallographic defects, Gibbs free energy, or true minerals changing polymorphs. The three growth biases are intentionally qualitative.

## 2. Two ways to mutate

**`mutateFronts`** scans exposed 3D voxel surfaces, leaving the already-grown interior unchanged. The **MUTATE LIVING FRONTS** button makes the crystal change laws halfway through growth, without resetting the simulator. In a sparse dendrite many cells are exposed; the operation can touch a large fraction of a branching colony, but never removes material or rewrites its birth timestamps.

**`mutateRegion`** operates only on existing material within a cylindrical X/Y brush radius and a finite Z interval. The **🧬 MUTATE** touch tool can paint this at a selected Z-depth, reach and radius, with stroke interpolation. The brush automatically uses the 2D view because camera-orbit screen positions would not accurately specify where 3D material is being painted. It switches the diagnostic viewer to Z-slice so users can inspect edits even if their phone's GPU is unavailable.

Both operations support **primary** and **partner** genes, blend ratio and angle. `geneHash(x,y,z,world.seedValue)` gives stable, deterministic mixed selection with no random-number generator consumption; all 199 palettes remain usable. A pure mutation uses a 0% partner ratio. A mixture across a crystal produces same-owner, different-law voxels, measured as a **chimeric crystal**. The gene/orientation/lineage field colors the exact same 3D mesh and 2D slice via palette-index shifts; existing palettes and their original color stops are not replaced.

## 3. State, Undo, and compatibility

The mutation buffers, edit IDs, and event counter are included in `VolumeField.snapshot()/restore()`, so undo is bit-for-bit reproducible. Melting or fracturing a voxel clears its current genotype, while fossil mineral history still persists; newly filled voxels inherit their neighbors' current laws. Mutations never alter the unrelated 2D phase-field, radial, tip, or front systems. Shape geometry uses existing sharp-face or smooth marching-tetrahedra algorithms; mutation changes where new material grows but does not fabricate an independent mesh or texture.

The default application still opens with the original multi-engine artwork. Select a volume anatomy or click **PLANT 3D SPECIMEN** under MUTATION for a one-tap mutation-ready specimen. The new UI is mobile-first and the mutate tool remains usable via the Canvas 2D fallback.

**Known limitations:** no true 3D ray picking while orbiting; mutation painting uses screen X/Y and selected depth in 2D inspection. No calibrated thermodynamic kinetics, real polymorph crystallization, elasticity, or volumetric light transport. GPU path may fail on older Safari and falls back to Canvas 2D. An artist can mutate while simulation is running, and undo pauses the restored scene.

## 4. Tests / palette release guards

`tests/mutation.test.mjs` verifies the 3D gene buffers, owner/age preservation, competitive within-grain inheritance, depth-restricted brush, exact snapshot restoration and deterministic offspring, and mesh independence, plus a direct A/B test proving that mutation changes subsequent **occupied 3D geometry**, not merely its colors. Earlier suites remain in place. The standalone builder includes `volume.js` and every existing renderer, and must use **the exact canonical 194-color MATHEMAGICAL vault** in `src/palette-vault.js` together with five local crystal finishes. The local headless browser preview uses a small color fixture *only for smoke tests*, **not for GitHub release**. No Netlify deployment was made.

## 5. Source files

- `src/volume.js`: new gene, geneAngle, lineage, mutation operations, competitive growth and snapshots
- `src/body3d.js`: existing true 3D geometry now samples inherited genotype and lineage
- `src/main.js`, `index.html`: MUTATION tab, touch tool, interaction controls and metrics
- `src/growth.js`: persistent default mutation settings
- `tests/mutation.test.mjs`: deterministic genetic-kinetic tests
- `docs/PROTOTYPE_A13.md`: this document
