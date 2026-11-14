# A.16 · Selective Evolution

An artist-directed **selection** stage for A.15 Mutation Nursery. It does not replace the 3D growth simulation or claim physically calibrated crystallography. A sibling trial runs in an isolated `CrystalWorld`, then `analyzeVolumeShape()` measures actual occupied 3D cells.

## Measured phenotypes

- **Spikes:** low-coordination exposed tips plus normalized axial elongation.
- **Branching:** exposed six-neighbor surface-face ratio plus proportion of tips. This is a surface-network proxy, not formal skeleton topology.
- **Hollow:** internal empty volume found by a padded-box exterior flood fill. A surface groove is NOT counted as an enclosed cavern.
- **Asymmetry:** 3-axis occupancy reflection mismatch plus centroid displacement from bounding center.
- **Novelty:** shape and gene-mixture distance from the closest other measured candidate/kept specimen; a lone candidate gets a neutral value.

Weights are artist-set, 0–100 each, and normalized into a score in the range 0–100. If objectives change, existing trials are re-ranked without rerunning growth. The scoring is transparent, subjective and reproducible for a fixed batch. No web service, ML model, ranking data upload or external API.

## How to use

1. On the **NURSERY** tab, grow four or six siblings as before.
2. Choose a quick selection preset or adjust the five trait weights. Ranking changes live.
3. **KEEP TOP THREE** adds the three highest-scoring current-generation specimens to favorites without removing other favorites.
4. **EVOLVE NEXT GENERATION** picks those three measured parents, promotes their **grown phenotypes**, and runs one new sibling batch. The user can still KEEP/PLANT/PARENT manually and run the original next-generation command.
5. Export the kept archive as JSON. A.16 archives include shape measures in the existing `mathemagical-crystal-nursery/v1` schema; older A.15 archives import but display **LEGACY · NO MEASURED SHAPE** rather than a made-up score.

At most 36 gallery records are retained. Older unkept results may be evicted, but manual KEEP specimens are never silently deleted. Trials never mutate the live artwork until PLANT is pressed. Neither selection weights nor score components depend on colors; the 194+5 palette vault remains untouched.

## Limitations

This is bounded procedural selection, not a population-wide optimizer, reinforcement learning, genetic science, or a guarantee of specific visual outcomes. Hollow scoring specifically rewards **closed** internal voids; near-open tunnels are not enclosed caverns. The branch score is a surface proxy, not exact dendritic graph extraction. WebGL2 hardware rendering still needs device testing; the 2D fallback works offline.
