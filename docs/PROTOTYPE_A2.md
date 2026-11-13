# Prototype A.2 — Frost Anatomy

A.2 creates **four individual growth anatomies** for crystals planted as separate grains:

- Cathedral: a 6-axis primary lattice with branching filigree.
- Feather: a 4-axis-biased and bilaterally needle-rich morphology.
- Starburst: eight primary axes with a narrower fork cone.
- Wild: no locked principal axes and a stronger stochastic heading drift.

Crystalline anatomy is a durable part of each grain. Changing the dropdown affects **newly planted seeds**, not existing growth.

**Microscopic frost needles** are actual lower-order growth tips, recorded as persistent level-4/5 material segments. They consume local resource, can be melted and restored, and are controlled by a frost density parameter. The branching-angle control steers future daughter tips without rewriting old material.

All grow through the existing resource-coupled CPU tip simulation. This is still a **physics-inspired kinetic approximation**, not a scientifically calibrated phase-field or solidification solver. The crystal bodies are strokes/segments, not real volumetric meshes.

## Guardrails

- No deployment or paid API.
- No automatic resetting when settings change.
- Limit active tips to reduce runaway CPU load on phones.
- Existing touch tools, export, pause, step, undo are retained.
- `node --test tests/*.test.mjs` covers deterministic growth, frost-off, different anatomies, collision/melt behavior, and undo.

## Next research

- Curling and crystallographic faceting with physically meaningful local growth rules.
- Grain-boundary anatomy and annealing.
- More realistic spatially varying solute/temperature fields with better stability and adjustable supercooling.
- Reference-quality optical finishes and richer 2.5D surface structure.
- Benchmark phones and test animated capture pipeline.
