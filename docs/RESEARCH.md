# Crystal research notebook — v0.1
Date: 2026-11-13
Status: research agenda, not a completed literature survey.

## Questions to investigate before coding each family
1. Which controls actually alter **crystal morphology**, not just speed? Study anisotropy, noise, attachment kinetics, solute diffusion and interface stability.
2. What causes branching and **secondary branching**, and how can we get visually elaborate forms without uniform snowflake symmetry?
3. How do **multiple seeds / grain orientations** change growth and collision boundaries? How should those boundaries persist through reheating?
4. Which approaches produce actual **faceted / hopper structures** and not merely faceted shading?
5. Can **spherulitic bundles** retain realistic radial variation and orientation while making deliberate psychedelic textures?
6. Can **precipitation bands** and crystallizing growth coexist as independently evolved material layers?
7. How should **translucency, birefringence, thin-film colors, internal inclusions and facet highlights** derive from persistent simulated fields?
8. How do we make **thermal brush melting and regrowth** alter the material, preserving surrounding layers?
9. Which steps can run reliably in **WebGL2 on iPhone**? Test supported texture types, render targets, stability and precision.
10. Where should science-inspired / speculative growth (especially quasiperiodic or competing hybrid materials) be explicitly labeled artistic inventions?

## Reference lead (to review, not copy blindly)
- [SOLIDIFY browser crystallization simulator](https://github.com/fronkt/solidify): investigate its phase-field formulation, discretization choices, performance assumptions, licensing and WebGPU architecture before adopting any techniques. Its approach should not dictate the whole app.

## Morphology observation targets
- Dendritic ice / snow crystal branching
- Bismuth hopper / skeletal growth
- Polarized-light spherulites
- Mineral dendrite deposits
- Liesegang periodic precipitation
- Eutectic lamellae / rods
- Grain boundaries in polycrystalline materials
- Crystal twinning and disordered orientation fields

## Finish library experiments
| Finish | Underlying variables | Artistic dials |
| --- | --- | --- |
| Polarized crystal | Orientation, local thickness, illumination / polarizer | Contrast, saturation, spectral mapping |
| Thin-film / oxide | Film thickness, surface orientation, angle of view | Spectrum range, oxide zoning |
| Ghost growth | Growth timestamp / shell depth / inclusions | Transparency, inner glow, occlusion |
| Dark metal | Surface normal, environment illumination, edge roughness | Black point, highlight width, metallicness |
| Fluorescent fracture | Fracture mask, impurity distribution, emissive contribution | Emission, falloff, color accents |

## No-cheese visual acceptance criteria
- Looks designed in monochrome before special effects.
- Growth history is visible and meaningfully changes the final pattern.
- Distinct engines create distinct silhouettes; multiple presets in the same engine are not cosmetically identical.
- A finish accentuates facets, grain boundaries, depth or material changes, instead of coloring every pixel equally.
- User can choose **restricted colors, maximal saturated colors, dark mineral, or no color at all**.
- Animated transformation originates in a real update to the state, not just oscillating uniforms.

## Future research / implementation notes
Add verified paper links, findings, formulae, shader implementation caveats and performance measurements as experiments progress. Record **observed / inferred / invented** for each experimental morphology so scientific inspiration remains traceable.
