# A.11 — Volumetric Crystallization: THREE-AXIS MINERAL GROWTH

**Status:** independent stateful 3D voxel-solidification experiment, integrated into Crystallization Apocalypse. This is a new *growth engine*, not the A.10 extrusion model in disguise.

## What changed in the physics

A new `VolumeField` maintains the material domain

- `owner[x,y,z]`: identity of crystal grain, zero = liquid;
- `nutrient[x,y,z]`: independent, evolving dissolved-material supply;
- `birth[x,y,z]`: discrete time at which each solid voxel attached;
- `frontier`: 3D liquid cells adjacent to actual solid matter, with competing grain ownership candidates;
- deterministic RNG inherited from the main world; seeded x, y, **and z**.

Three new anatomies have *different 3D attachment biases*:

1. **Six-Axis Needle Star**: cubic-axis-favoring growth, needle/arm protrusion.
2. **Octahedral Facets**: body-diagonal-favoring, angular attachment.
3. **Mutant Cavern Coral**: weak symmetry plus stable spatial heterogeneity, leaving irregular cavities.

Each simulation step can attach new solid cells in all three directions based on existing neighbors, local solute availability, persistent grain orientation, and the selected anatomy. A fair grain rotation prevents older, larger crystals from monopolizing every candidate.

### 3D transport

An independent six-neighbor concentration field evolves by a bounded explicit diffusion update:

`c_next = clamp(c + d*(c[x+1]+c[x-1]+c[y+1]+c[y-1]+c[z+1]+c[z-1]-6c) + r*(1-c), 0, 1)`

Solid cells have zero dissolved material. The exterior reservoir is fixed to unity. For positivity of the explicit stencil, `0 <= d <= 1/6`. The interface exposes the conservative range 0–16%. Attachment consumes the candidate-cell nutrient.

**Scientific honesty:** this is a deterministic, resource-coupled 3D lattice-front model, **not** a thermodynamic 3D phase-field PDE, exact diffusion-limited aggregation, molecular crystal simulator, or measured crystal optical response. All three morphologies share the same basic attachment engine but distinct 3D orientation rules. The shape is *volumetric*, the material physics remain an artistic approximation.

## Real geometry

`buildVolumeMesh(volume)` triangulates the surface of **the actual occupied x/y/z voxels**, with exposed face normals and facet-centered triangles. Voids created by growth or the MELT tool remain open because the triangulator only emits exposed faces; the third axis is not a height map.

The existing `buildCrystalMesh(world)` concatenates the A.10 2D extrusions with the new 3D mesh; the previous four families are untouched. GPU material shading uses per-triangle face normals, growth chronology, spectral palette lookup, and editable lighting. These are artistic approximation, not traced physical scattering/refraction.

WebGL2 is entirely optional. The separate `renderVolumeProjection()` CPU diagnostic can show all depth layers combined or any selected **single Z-layer** in ordinary Canvas2D. This is also available in the offline standalone HTML, so no CDN, API key, node packages, or Netlify deployment is required.

## Artist controls

**GROWTH** → select one of the three A.11 volume morphologies. You will see: `Volumetric growth speed`, `Crystal axis selection`, `Mineral irregularity`, `3D nutrient diffusion`, `3D nutrient recovery`, `Depth of newly planted seeds`. The existing anatomy setting still applies only to **new grains**. Current seeds never morph retroactively.

**BODY 3D** → toggle the real 3D GPU mesh and orbit/zoom; alternatively choose `Volume projection` or `Z-slice` for a trustworthy 2D inspection of 3D state.

**MELT** → excavates a real full-depth cylinder in a volume crystal, exposing new growable surfaces; **FEED** restores dissolved material in the same column. Undo returns the exact 3D cell identities, nutrient field, material ages, and candidate frontiers. New Seed, Refresh, and Restart all work with A.11 species.

**STUDIO** → volume-cell count, number of occupied Z-layers and live growth-front size. High-resolution PNG uses GPU 3D view when enabled, or the 2D projection / Z-slice otherwise.

**Palettes:** the canonical MATHEMAGICAL vault is 194 source recipes plus five original crystal studio palettes = **199 total**; imported into the modular project and embedded verbatim into the built `standalone.html`. Every original color stop is retained, including 12-color recipes. No limits are introduced by the new volumetric renderer.

## Validation

- Full existing regression suite plus 12 volume tests: **91 tests**, all passed locally.
- Different symmetries form different occupancy, nutrient concentrations remain finite and bounded, shapes occupy independently changing Z-slices, volume and existing 2D meshes coexist, surface vertices have finite normals, melt opens cavities and regrowth resumes, snapshot and Undo exactly restore material state.
- Headless Chromium test of standalone on desktop and phone-sized viewport passed without page errors: new modes appear, a new seed grows, projection and slice controls work, and WebGL2-unavailable fallback avoids blank output.
- **Actual WebGL2 shader rendering on iPhone Safari has not been tested** in this execution environment; its compiled behavior must be validated on real hardware.

## Next investigations

Marching-cubes or dual-contouring smoothing, actual 3D phase-field / growth thermodynamics, fracture planes that traverse 3D structures, accurate Fresnel optics / volumetric attenuation, and hardware profiling of the iPhone WebGL renderer. The existing 3D model currently uses faceted voxel surfaces, which will appear angular by design.
