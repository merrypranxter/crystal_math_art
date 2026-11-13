# CRYSTALLIZATION APOCALYPSE
### A living laboratory for impossible crystalline matter

**Project:** Mathematical crystal-growth art studio  
**Repository:** `merrypranxter/crystal_math_art`  
**Status:** Research and architecture established; simulation prototype not yet implemented.

A crystalline growth front should actually advance through an environment. Seeds nucleate, branches compete for solute, grain boundaries emerge, materials change phase, crystals melt and regrow. The art must remember how it formed.

## Creative direction

- **Real evolving mathematics, not rotating premade shapes.** The geometry and history should emerge from the simulation.
- **Distinct morphologies.** Snowflake-like dendrites, radial spherulites, faceted/hopper growth, precipitation bands, eutectic structures and experimental quasicrystal-inspired designs must not collapse into one look.
- **Optically interesting, not cheap neon glitter.** Materials can use plausible birefringence, thin-film interference, transparency, internal inclusions, edge highlights and reflective metals, with deliberate artistic exaggeration.
- **Wild color *and* beautiful monochrome.** A strong black-and-white growth simulation comes before lavish finishing.
- **Artist control.** Touch tools plant seeds, heat, melt, contaminate, redirect or carve a persistent material system; edits must never silently reset the composition.
- **Mobile first.** Keep the artwork visible with controls grouped by purpose, easy iPhone interactions, adjustable quality and inexpensive local preview.
- **No deployment required to develop.** Netlify deploys are optional and should not happen without explicit request.

## Initial proofs

1. **Black Ice Cathedral** — branching anisotropic crystal growth, secondary branching, competition for nutrients, local melt-and-regrow.
2. **Chromatic Heresy** — interacting radial/spherulitic colonies, persistent orientation/grain boundaries, polarized-light-inspired color.
3. **Bismuth Necropolis** — growing hollow/stepped faceted structures, actual geometric terraces, restrained optical films.

Each proof must have a structurally different growth rule, a visible advance over time, meaningful controls, touch interaction and a monochrome mode. Do not fake any proof by only animating UVs or changing a shader's appearance over time.

## Working documents

- [Architecture & experiment plan](docs/ARCHITECTURE.md)
- [Research questions & source leads](docs/RESEARCH.md)

## Status legend

- **Concept/design:** described but not implemented
- **Prototype:** a running exploratory implementation
- **Verified:** tested for meaningful dynamic behavior and interaction

The currently documented engines are **concept/design only**. No simulation or export implementation is claimed yet.
