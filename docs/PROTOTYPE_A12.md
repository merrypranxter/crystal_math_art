# A.12 — CRYSTAL METAMORPHOSIS

**Scope:** genuine 3D fracture history, two interchangeable 3D mesh surface algorithms, geometry-informed optical attenuation. Builds on A.11's 3D nutrient-fed cell growth. Fully local; no backend, external library, or Wolfram API call needed at runtime.

## 1. Internal fractures that alter volume

For **volume** crystals, the existing ◇ FRACTURE tool now calls `VolumeField.fractureShear(worldX,worldY,radius,zPercent,reach)` through `CrystalWorld.fracture`. It removes occupied x/y/z voxels in a *finite-depth, sheared cylindrical fissure* centered at the user-selected Z-depth. `volumeFractureReach` controls the number of Z planes reached. Fracture splintering uses deterministic spatial variation (not an animated texture). Rebuilding the 26-neighbor exposed-front set leaves newly exposed surfaces available for nutrient-fed regrowth. The original phase-field fracture operation is preserved.

Four persistent voxel datasets now describe material history:

- `birth`: tick of the **current** solidification (0 for empty)
- `fossilBirth`: birth tick of mineral removed by a fracture
- `generation`: number of recrystallizations recorded after a prior fracture
- `scar`: an unoccupied cut that may refill (`255` until refilled)

After growth refills a fractured voxel, `generation` increments and the old `fossilBirth` remains available; the fresh `birth` is greater. The original `owner` and nutrient fields continue to be the actual model state. Undo serializes all four history arrays and the frontier along with the rest of the `CrystalWorld` snapshot. The 2D Z-slice preview shows a faint fossil tint at empty scar voxels.

**Important:** This is material removal + nutrient-fed regrowth in a discrete 3D growth model, not a real elastic stress/fracture FEM simulation and not an atomistic defect theory. A.11 MELT still uses its original through-Z bore; A.12 FRACTURE is shallower and depth-selective.

## 2. Surface extraction: sharp vs smooth

The **BODY 3D → 3D volume surface topology** selector is reversible and does not write to the simulation.

- `SHARP · CRYSTALLINE VOXEL FACETS`: existing A.11 exposed-voxel quad faces with raised facet centers.
- `MELTED GLASS · SMOOTH ISOSURFACE`: a new marching-tetrahedra triangulation of a 3D scalar field obtained from current voxel occupancy. The scalar value at a grid point equals `(4*occupied + six face-neighbor occupations)/10`. Every tetra in a six-tetra decomposition is polygonized at the `0.32` isovalue. Triangle normals come from the negative 3D scalar gradient. **This changes geometry, not how cells grow.**

The smooth mode can produce thousands of true triangles and is throttled to rebuild at most once every 800 ms during growth; sharp mesh remains on the prior 145 ms rebuild budget. Older **2D** growth families keep their existing 2D-derived extrusions, which are appended independently to either 3D volume surface mode.

The facet mode and isosurface mode are triangulated representations of the **same** occupied volume. Neither is a thermodynamic surface-energy minimization, voxel deformation physics, or Blender-quality mesh sculpting. The smooth mode may visibly merge nearby very thin branches as part of scalar smoothing.

## 3. Optical thickness response

`volumeThickness(volume)` calculates the fraction of each (x,y) Z column occupied by real mineral. The mesh stores this value as a normalized per-vertex attribute (reusing the existing ninth attribute float to preserve the compact GPU layout). The existing spectral shader now applies wavelength-dependent, Beer–Lambert-**inspired** exponential attenuation `exp(-uOpticalPath * thickness * [0.35,0.90,1.65])`, with a user slider **Thickness-driven color absorption**.

This is a color/material visualization derived from actual volume thickness. It is **not view-dependent path tracing or physical optical refraction**, does not model scattering, anisotropic refractive indices, polarization inside the 3D body, caustics, or accurate real mineral extinction coefficients.

## 4. Controls, compatibility and availability

GROWTH → choose any one of the three VOLUME anatomies to reveal **Fracture layer · Z depth**, **Fracture reach**, and **Crystal regrowth in old cuts**. Under BODY 3D switch between surface styles, adjust optical thickness, orbit/light/zoom, and inspect a single Z-layer when WebGL2 is unavailable. New Seed, Refresh, Restart, Undo, PNG export, other growth families, and full original color editing stay intact.

- The original canonical **194 MATHEMAGICAL palettes** remain unmodified in `src/palette-vault.js`, alongside the five local crystal palettes: **199** total.
- `standalone.html` is assembled with every original palette and every color stop; no imports, packages, or network calls at runtime.
- The browser test setup here has no WebGL2 context. We verified 2D fallback, direct touch, Z-slice, controls and undo in Chromium at desktop and phone sizes, and validated geometry numerically with automated tests. **Actual GPU rendering and iPhone Safari hardware performance have not been confirmed**. The fallback must remain intact.
- No Netlify deployment or API calls were made.

## Tests

`npm test` runs all existing A.1–A.11 model tests plus `tests/metamorphosis.test.mjs` covering 3D excavation across layers, physical reach differences, recrystallization/generation history, exact undo, two distinct meshes, finite normals, pure deterministic mesh generation, and occupancy-derived optical thickness. Visual browser smoke: `browser_a12_smoke.py` (local development only).

## File inventory

- `src/volume.js` — occupancy fracture + historical buffers + live regrowth
- `src/growth.js` — selects correct phase and volume fracture systems
- `src/body3d.js` — sharp and smooth isosurface geometry + thickness shader
- `src/main.js`, `index.html` — grouped UI, pointer tool, controls, metrics
- `tests/metamorphosis.test.mjs` — A.12 regression coverage
- `docs/PROTOTYPE_A12.md` — this document
