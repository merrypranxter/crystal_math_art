# A.15 — Mutation Nursery / Evolution Gallery

## What exists

The NURSERY tab generates batches of **four or six actual, independent 3D growth simulations** from the three parent DNA slots already present in A.14. Each sibling is a child of the supplied parent mixture plus deterministic, bounded recombination and orientation variation.

- **Same trial environment.** Every sibling in a batch uses the same seed for its environment, same preview dimensions (default `CrystalWorld(172)`), same growth controls and same requested step count (36, 56 or 90). Genetic differences, including each recipe's inherited random seed, create different shapes. Changing the trial-step count changes the measured outcome; comparisons between batches should use the same duration.
- **Not a texture generator.** `evaluateSibling` in `src/nursery.js` creates a new `CrystalWorld`, calls the existing A.14 `plantOffspring`, advances real `VolumeField` nutrient/growth simulation, and captures the actual solid cells and gene counts. It never advances the artist's current world.
- **Image preview.** Every thumbnail is a palette-recolorable isometric rendering of the actually exposed 3D voxel faces, with a compact 2D projected map stored as a fallback. The three-gene ratio bar and voxel/depth measurements are extracted from each grown trial. No WebGL is needed to view the nursery.
- **Curation.** Keep specimens in a temporary shelf; promote any grown phenotype into Parent A, B, or C; choose BREED THREE KEPT FAVORITES to use the newest three kept phenotypes as the next generation's parents. This action does **not** alter the existing crystal artwork. Planting an individual sibling explicitly introduces its DNA into the live 3D scene and creates one Undo step.
- **Portability.** EXPORT KEPT GENOMES downloads a versioned JSON archive with the saved phenotype, recipe, measurements and small projection for each kept specimen. IMPORT validates the schema, thumbnail length and values, and capacity before adding new records. The user's browser environment may not allow persistent storage for offline `file://` HTML, so **keeping is in-memory until you export**. Duplicates are skipped; import never silently clears an existing nursery.
- **Safety/performance.** Trials are bounded to eight siblings and 130 steps per pure API call. The UI offers up to six siblings and 90 steps. It runs one sibling per animation frame and pauses the main simulation during the batch, then restores its previous paused/playing state. A 36-specimen gallery cap evicts oldest unkept trials first and never evicts a kept specimen.

## Scientific and practical limitations

This is *procedural evolutionary art*, not mineral genetics or a calibrated selection simulation. The displayed “phenotype” is measured from grown 3D voxels, but the mini-trial environment is smaller than the full working canvas; therefore planting a selected recipe into an existing full-size scene does **not** guarantee pixel-identical geometry. Existing collisions, nutrients and site history matter. The roughness statistic comes from exposed voxel faces; it is not a real crystallographic roughness measurement.

React or Three.js is not required for these discrete 3D trial simulations: the existing lightweight JavaScript growth engine is a closer match to this task and runs offline. WebGL2 stays optional for viewing the live 3D body.

The MATHEMAGICAL palette vault remains **194 unmodified recipes**, plus the five original crystal palettes (199 total), preserving palette search, editing, randomization and shuffle. Nursery thumbnails recolor on every palette change without modifying their captured genetic or occupancy measurements.

## Validation

Run `npm test`. The A.15 tests cover deterministic batches, parent immutability, genuine 3D material growth, geometrical differences between inherited laws, independent worlds, palette-only recoloring, archive export/import, malformed files and using grown offspring as parents. A browser run also exercises mobile/desktop generation 1 and 2, the KEEP and PLANT buttons, Undo, JSON download/import and the no-WebGL fallback. Production iPhone Safari performance is not confirmed by desktop/headless tests.
