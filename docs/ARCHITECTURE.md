# Architecture & experiment plan — v0.1
Date: 2026-11-13
Status: design proposal, not implemented

## North star
A **stateful crystalline growth studio**, rather than a catalog of shape shaders. A simulation writes material state; rendering reads that state; artist tools alter conditions and the future of the material. Different growth engines may have different field requirements. Avoid an expensive universal solver or generic slider soup.

## Core separation
1. **Simulation model** — nucleation, solute / heat transport, phase transitions, anisotropic surface motion, orientation, competition and boundaries.
2. **Persistent state** — per-pixel or per-cell solid fraction, nutrient concentration, temperature, seed identity, grain orientation, impurity field; optional growth timestamp and older-layer history. Each engine declares what it needs.
3. **Geometry extraction / surface structure** — contours, normal/height maps, shells/terraces, fractures and fine branching. A 2.5D system can look dimensional without volumetric memory cost.
4. **Optics / material finishes** — monochrome first, then lighting and orientation-dependent palette, birefringence-inspired interference, thin-film-inspired oxide and translucent inclusions. Separate optical style from physics.
5. **Artist operations** — plant, erase, heat, freeze, poison, fracture, steer the concentration field, inspect historical layers; gesture edits are reversible and never secretly randomize.
6. **Capture & serialization** — deterministic seeds, reusable presets, checkpoints, scalable still export. Later: time-based GIF/MP4 export only after reliable simulation and tested frame delivery.

## Engine candidates
| Engine | Mechanism | Creative value | Caveat |
| --- | --- | --- | --- |
| Anisotropic phase-field | Solid/liquid interface evolves under thermodynamic driving and anisotropic interface energy | Controlled crystalline fingers and competing branches | Realistic numerical models can be expensive and need stability tests |
| DLA / diffusion aggregation | Walkers or nutrient transport add material preferentially at the interface | Branching filigree and branching randomness | Plain DLA is not a full physical crystallization model |
| Multi-seed grain competition | Local orientation and competition for growth resources | Collision fronts, orientation territories | Needs persistent grain IDs and explicit boundary behavior |
| Spherulitic growth | Radial growth of orientated fibrils / crystalline bundles | Fan structures, bands, collision arcs | An illustrative model must not be mislabeled a full polymer kinetics solver |
| Faceted / hopper growth | Growth-rate anisotropy and edge vs face kinetics | Hollow steps and crystalline architecture | Use a specialized model, not dendrite shader with angular normals |
| Reaction / precipitation banding | Diffusion/reaction thresholds and material deposition | Liesegang-like rings and fossil layers | Separate reaction bands from crystal lattice growth |
| Coupled two-phase growth | Simplified coupled front competition for phases | Lamellae, rods, interference between constituents | Eutectic realism is a later research task |
| Quasiperiodic variant | Quasicrystal-inspired symmetry and orientation constraints | A deliberately speculative family of growth morphologies | Do not claim a generic phase-field simulation is a quasicrystal solver |

## First implementation sequence
**Phase A: Black Ice Cathedral**
- Small WebGL2-friendly 2D simulation with seeded growth, anisotropy and nutrient/transport coupling.
- Prove true advance and secondary branch formation (log a growth metric each step).
- Add two or more seeds with clearly persistent growth history.
- Add direct touch plant and temperature/melt brush. Melt changes state; regrowth uses remaining material/conditions.
- Render in strict monochrome with good antialiasing and detail before finishes.
- Add pause, step, restart (with confirmation), deterministic seed and image saving.

**Phase B: Chromatic Heresy**
- Oriented radial colonies and collisions with grain orientation/ID fields.
- An orientation-aware palette and polarized-microscopy-inspired finish; independent finish toggles.
- Respect boundary persistence and per-grain treatment.

**Phase C: Bismuth Necropolis**
- Specialized faceted terrace/step growth model.
- Add depth-aware geometry/height, reflective/oxide film shader as an optional material.
- Avoid implying a 2D front reproduces all real-world 3D mineral morphology.

## Mobile UI contract
- Artwork stays onscreen above/beside grouped controls; no scrolling past acres of duplicate settings.
- Sections: **GROWTH**, **ENVIRONMENT**, **SEEDS & COMPETITION**, **MATERIAL**, **LIGHT**, **TOUCH**, **HISTORY & EXPORT**.
- Separate **Reset environment**, **New crystal**, **New composition**; destructive actions require confirmation.
- Buttons should never unexpectedly overwrite handcrafted work.
- Preset changes ask before replacing live state, and users can preserve current growth while swapping optical finish.
- Draw on artwork: tap plant seed; drag heat/solute/force; pinch zoom without interfering with brush gesture.
- Provide meaningful organism-like growth modes rather than many slight variations of one shape.

## Performance & portability
- WebGL2 baseline for broad iPhone Safari compatibility. WebGPU is an optional future path with feature detection.
- Separate simulation resolution from output resolution. Conservatively scale iteration count based on device.
- Use ping-pong field textures where appropriate; keep state formats compatible with supported mobile float/half-float capabilities.
- Offer low/medium/high simulation quality and a slow-motion/step view for inspection.
- User should be able to develop locally and review GitHub code without deployment. No paid APIs or backend required for first proofs.

## Scientific honesty & visual quality gates
- Label simulated physics, physics-inspired approximations and purely invented artistic effects.
- No bloom as substitute for interesting topology. Test grayscale silhouettes, growth time-lapse and interaction before adding vivid materials.
- Growth proof: same state can evolve in multiple ways based on temperature, solute, nucleation and anisotropy.
- Persistence proof: melt one area without restarting another; visible old boundaries remain.
- Material proof: move light/polarizer independently from growth, with facets/internal optical parameters actually changing the appearance.
