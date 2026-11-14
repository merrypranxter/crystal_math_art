# A.10 — Crystal Bodies: native WebGL2 volumetric mesh view

## What shipped

A **separate optional true triangle-mesh visualization** of the living crystal state, selectable under **BODY 3D**. The existing 2D growth simulation, all four existing growth families, paint tools, history, palettes, controls, and export remain the source of truth. The view is not an unrelated premodeled 3D shape; it is regenerated from occupied cells.

- `src/body3d.js`: pure, testable mesh generation plus WebGL2 vertex/fragment shaders, VAO/VBO, depth testing, and palette texture.
- **Occupied material** comes from `CrystalWorld.crystal` for every species: tip dendrites, accretion fronts, phase-field growth and spherulites.
- **True 3D geometry**: raised top triangles, exposed vertical side walls, and back faces. Volume reacts to actual solid footprints. A chamfer distance field creates broader inner ridges and thinner filaments; deposited age and stored growth banding change facet heights and optical material.
- **Artist-friendly GPU shading**: per-triangle facet normals, movable directional light, growth-history color bands, depth-sensitive absorption, separate wavelength sampling from all the original palette stops, and adjustable translucent edges.
- **Touch**: tap `ORBIT 3D` under the canvas to rotate the view; on touch devices, drag to orbit or pinch with two fingers to zoom. Controls also expose yaw, tilt and zoom. This is a camera interaction and never edits saved crystal matter.
- **View safety**: a guarded enable toggle, explicit active/fallback status, bounded mesh-detail presets, a 145 ms mesh rebuilding throttle while crystals are growing, and automatic return to Canvas 2D if a WebGL2 context cannot initialize or is lost.
- **PNG capture**: when 3D view is enabled, the existing 2400×2400 PNG export draws the 3D camera view instead of quietly exporting a different 2D image. It attempts a 2400px GPU render but respects device maximum buffer limits.
- **Standalone**: the dedicated `scripts/build_standalone.py` includes `src/body3d.js` inline. No React, CDN, npm browser dependency, API key or paid network call; it can be opened as a normal HTML file if the browser supports WebGL2. React is not inherently useful here; direct WebGL2 delivers the geometry without a large offline library bundle.

## Physical model / important honesty

The growth processes are still the existing **2D** mathematical simulations. The optional 3D body is a **true triangulated extrusion and displacement field** derived from their evolving surfaces, with normals and side walls, not a flat 2D plane and not precomputed animation. It is **not** a full 3D reaction-diffusion or phase-field solver, true mineral facet atomic structure, physically calibrated refraction, or real multispectral birefringence. The glassy appearance uses an artistic fragment shader, simple transmittance, and palette-chroma offsets rather than multi-bounce ray tracing. Translucency is not depth-sorted and should be considered a stylized surface approximation.

All **194 original** MATHEMAGICAL vault palettes and **five** Crystal Studio palettes must remain unchanged in `src/palette-vault.js` and `src/palettes.js`. The standalone must embed the canonical vault in full. The local development smoke-test palette vault may use a fixture—never commit that over the real vault.

## Performance expectations and QA

- Initial view uses balanced geometry resolution. Fine mode can generate substantially more triangles and costs memory; test actual iPhone Safari separately.
- Pure mesh geometry is deterministic for a fixed physical state and camera changes do not modify the simulation.
- Unit tests check wall/underside generation, multiple crystal families, thickness, finiteness, and nonmutation; existing 70 regression tests must continue passing.
- Headless Chromium in the current environment did **not** supply a WebGL2 context, even with software GL flags. The Browser2D fallback was tested on desktop and phone-sized viewports; real 3D GPU hardware was not verified here. Report that limitation instead of falsely claiming native iPhone testing.

## Next candidate

A.11 may integrate independent 3D propagation fields, interior slices, thickness-preserving fractures, physically motivated refractive caustics, or R3F/Three.js when it adds a compelling behavior beyond an artist-facing camera and a raw-GPU material. Improve GPU hardware QA before moving to full spatial volumetric simulations.
