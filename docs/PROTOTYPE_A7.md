# A.7 — Crystal Archaeology & Fracture Gardens

**Status:** running physics-inspired prototype / nonphysical fracture and regrowth model, November 13, 2026.

## What it does

The **◇ FRACTURE** brush cuts real solid phase-field material (solid fraction, occupancy and current grain identity), not a shader line. Its damaged cells retain a fossil of the old solidification birth tick and generation. The phase-field equation can repopulate the fissure, generating **new deposition ticks and incremented generation numbers**, and the preserved scar becomes a visible seam. Crack shape has deterministic material heterogeneity and optional physical side-cuts. This makes interactions reproducible with the same seed/path.

The **CRYSTAL ARCHAEOLOGY** finish renders existing, past and regrown material: height/contour from real occupied phase, internal bands from deposition timestamps, layer generations from persistent counters, and translucent projections of prior solidification in open cuts. Render-only controls do not change physics or the simulation RNG.

## New touch and grouped controls

- **FRACTURE** below the canvas: draw cracks in the three phase-field crystal types. Other growth engines are deliberately left alone. Tap/drag changes actual solidification state.
- **ARCHIVE tab:** fracture width, splintering, crack recrystallization, and old-layer reveal strength.
- **FINISHES → CRYSTAL ARCHAEOLOGY:** show archaeological material. The four A.6 mineral finishes are preserved.
- **UNDO:** snapshot includes `phi`, current grain owner, `birth`, `fossilBirth`, `generation`, `scar`, phase branches, and the wider world arrays. One continuous drag is one undo operation.
- **New Seed / Refresh / Restart** and the **194 exact MATHEMAGICAL vault entries plus five studio presets** are retained.

## State fields

| Field | Storage | Meaning |
| --- | --- | --- |
| `phi` | Float32Array | Live solid fraction; growth and melting update it |
| `owner` | Uint8Array | Current crystallizing grain |
| `birth` | Uint32Array | Tick+1 when current material became solid; 0 in liquid |
| `fossilBirth` | Uint32Array | Previous generation's birth tick+1 after removal |
| `generation` | Uint16Array | Number of distinct solidification episodes per cell; 0 never solid |
| `scar` | Uint8Array | 255 open crack; reduced value after recrystallization |

For a new solid: set current birth; increment generation exactly once per newly solidified cycle. For melted / broken material: copy its current birth to `fossilBirth`, then clear current birth and solid fraction. When regrowth occurs, a new birth is recorded and the prior birth remains in `fossilBirth`.

## Fracture-healing mechanism (deliberately artistic)

Drawing FRACTURE removes material within a finite-width, spatially perturbed brush region, conserves previous growth timestamps, and partially restores local dissolved nutrient. At **0% healing**, open scarred cells are prevented from filling by the PDE. At positive healing, nearby intact material contributes a bounded additional source proportional to the local solid interface and nutrient, enabling gradual recrystallization. A healing scar remains in the material after refill. These rules are independent of optical finish.

This is **not fracture-mechanics FEM, atomistic cleavage, a validated Griffith model, or physically calibrated crack-tip dissolution**. It makes meaningful, persistent, interactive mathematical art.

## Limitations and next research

- Fracture currently targets **phase-field grains only**. Tip-branches and discrete accretion crystals require a different topology model before convincing fracture propagation is possible.
- The phase grid is deliberately coarse for iPhone performance; fracture widths are quantized by its cell spacing.
- The archive stores a **previous birth plus generation count**, not a full arbitrary-depth geological voxel stack. Unlimited layered excavation is future work.
- Recrystallization is driven by the simplified phase-field transport and an illustrative crack-local source term, not a fully coupled thermodynamic solute/fluid/fracture simulation.
- The A.6 renderer is **2.5D**; transparency and ghost layers are artistic compositing, not volumetric refraction or birefringence.
- Current PNG exports render the archaeology finish at the same composition and static detail as the interactive preview. Animated GIF/MP4 are deferred.
- Performance on actual iPhone Safari still requires hands-on testing.

## Verification

Run `node --test tests/*.test.mjs` (or `npm test`). New A.7 tests verify that real solid cells disappear, old ages persist, snapshot/undo restores exact arrays, 0% healing protects cracks, positive healing forms a later generation, fracture branching is deterministic, the archive view does not mutate physics, and older growth families remain unchanged. Mobile-sized and desktop Chromium UI checks cover pointer dragging, archive tab, material finish, Undo, New Seed and guarded Restart. No Netlify deploy is needed.
