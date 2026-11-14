# CRYSTALLIZATION APOCALYPSE
### A living MATHEMAGICAL laboratory for impossible crystalline matter

**Latest: A.12 — CRYSTAL METAMORPHOSIS**, building on the independently growing 3D volume introduced in A.11.

The existing A.11 crystal volume grows real occupied matter independently through **x, y and z**. A.12 adds touch-carved depth-specific fractures, previous mineral-generation memory, a switch between **sharp facets** and an interpolated **smooth isosurface**, and color-selective optical absorption driven by actual Z-column thickness. The older 2D engines are preserved unchanged.

## Try it

- **[standalone.html](standalone.html)** — one offline HTML file, all source embedded, no CDN, hosting, API, extra package, or secret key required. Open in Buffer or any modern HTML viewer.
- In **GROWTH**, pick one of three new volumetric specimens: `Six-Axis Needle Star`, `Octahedral Facets`, or `Mutant Cavern Coral`. Tap **NEW SEED** to add a colony, or **REFRESH** to start an A.11-only composition. REFRESH and RESTART are explicitly confirmed and Undo restores your previous art.
- In **BODY 3D**, choose either **SHARP FACETS** or **SMOOTH ISOSURFACE**, then **ENABLE 3D BODY VIEW** and **ORBIT 3D** to rotate with touch/pinch; or inspect the authentic **2D volume projection / individual Z-slice** when 3D GPU is unavailable.
- **MELT** carves a true tunnel through the volume; **FRACTURE** creates a depth-selective sheared fissure and preserves the older crystal generation; FEED restores nutrient. The colony can grow into the space again. Use the 3D growth controls for symmetry, growth rate, nutrient diffusion, replenishment, seed depth, and irregularity.
- Under FINISHES you'll find **all 199 palettes**: the 194-entry source MATHEMAGICAL palette vault plus five crystal originals, with full original stops, randomization, shuffle, edit, and restoration.
- **STUDIO** provides a high-resolution 2400×2400 PNG of the 3D or 2D view and colony statistics.

For modular development, run `python3 -m http.server 8080` or `npm run serve` locally. To rebuild the self-contained page, run `python3 scripts/build_standalone.py`. Check the math with `npm test` (101 tests including the new metamorphosis suite).

## Growth engines

1. **A.1–A.2:** living branching tips with needle detail, nutrient competition, melting and regrowth.
2. **A.3:** cell-attachment crystalline fronts with distinct facet/coral biases.
3. **A.4–A.7:** evolving 2D phase-field material, instability, dated layers and fracture history.
4. **A.8–A.9:** radial spherulites with persistent fiber directors, grain boundaries, CPU/WebGL2 spectral optical treatments and the TWIST LIGHT brush.
5. **A.11–A.12:** independent **3D voxel-solidification** and solute transport, with three symmetries, real 3D exposed mineral faces, deep fractures, and regrowth history.

**A.10** provides the shared optional GPU body view and extrudes the *older* 2D species. **A.11/A.12** append a separate triangulated *true 3D grown volume*, with an optional smoothed marching-tetrahedra surface. Old 2D crystals are never silently transformed into the volume type.

## Science and device limitations

These are scientifically motivated **art engines**, not calibrated experimental crystal solidification or correct volumetric light transport. A.11 uses stable 3D finite-difference nutrient diffusion with a stochastic, anisotropic, resource-dependent attachment model; it does **not** solve a fully thermodynamic 3D phase-field PDE. Volume geometry can be sharply faceted or smoothed by marching tetrahedra; neither mesh option modifies the simulation state. GPU spectral shading and Z-column Beer–Lambert-inspired absorption are artistic material models, not physical ray-traced refraction or measured crystal optics.

The standalone page does not need React or Three.js because the small dedicated WebGL2 renderer avoids external dependencies on iPhone Safari, and preserves the 2D Canvas fallback. **The browser test environment did not provide a real GPU**, so the GPU view still requires an actual iPhone Safari hardware test. No Netlify deployment or spending is part of this build.

## Details and reproducibility

- [A.12 metamorphosis and honest physical limitations](docs/PROTOTYPE_A12.md)
- [A.11 implementation and mathematical limitations](docs/PROTOTYPE_A11.md)
- [3D material growth and projection](src/volume.js)
- [3D triangulated body mesh and WebGL2 shader](src/body3d.js)
- [Source and UI logic](src/main.js)
- [Complete palette recipes](src/palette-vault.js)
- [Automated metamorphosis tests](tests/metamorphosis.test.mjs)
- [Automated volumetric tests](tests/volume.test.mjs)
- [Previous stage, A.10](docs/PROTOTYPE_A10.md)
