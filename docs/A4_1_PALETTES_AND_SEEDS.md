# A.4.1 — Full MATHEMAGICAL palettes + lifecycle operations

## Source provenance

- Source: `merrypranxter/hyperbolica/data/mathemagical-palettes.json` (194 original palettes).
- Exact source metadata/colors copied as `data/mathemagical-palettes.json`; converted to a static ES module `src/palette-vault.js` so this app works via `file://` without fetch/CORS/network.
- Five preexisting Crystal Studio palettes are retained, making **199 choices**.
- No recipes are truncated: up to 12 original color stops per palette are preserved. Two-color palettes work too. The renderer interpolates every color stop into a 256-sample lookup so both segments and continuous phase fields can use the complete palette.
- Palette source names are shown as groups. Search matches name, ID and source. Selecting, editing, shuffling, randomizing and restoring colors do not alter simulation arrays or seed identity.
- No external CDN, keys or paid APIs.

## Lifecycle semantics

- **NEW SEED** selects an open position and plants a new colony using the chosen anatomy. It does not delete structures or change the saved composition seed. Undo reverses this addition.
- **REFRESH** prompts first, then chooses a new random 32-bit seed, clears the simulation, and plants three seeded colonies of the currently selected anatomy with a seeded jittered layout. New seed and placement are shown; existing palette/finish are preserved. Undo restores the previous specimen.
- **RESTART** prompts first, then clears and reconstructs the same seed and same saved initial layout and colony anatomy. Existing palette and currently selected controls are retained. **If the artist changed physics sliders after the original start, subsequent crystal paths can differ**, even with identical seed/layout.
- The default starting composition remains the A.4 original; existing user projects and screenshots are not silently reset.
- Undo restores crystal state *and* saved composition seed metadata.
- Long-standing simulation engines and touch interactions are unchanged.

## Tests/quality gates

- Original 28 model tests remain untouched.
- Added 4 unit tests: deterministic composition restart; seeded refresh changes positions; New Seed adds without deleting geometry and is undoable; lookup sampling honors 2/12-stop palettes.
- Mobile-sized Chromium browser smoke tests for modal cancel/confirm, Add Seed, Restart, Refresh, Undo, palette search and swatch editing. The **development fixture** used during browser UI tests has 3 representative source palettes; publish validation must check the actual 194-entry vault and 199 total choices.

## Architectural boundaries

- Render colors are not physically calibrated birefringence. Phase growth itself remains mathematical and independent of visual treatment.
- Full canonical data is kept in repo. `scripts/build_standalone.py` inlines the vault, renderer, simulation and UI into one complete HTML file for offline use.
- Deploy to Netlify only if explicitly requested.
