# A.9 — Optical Heresy (GPU / Canvas spectral microscopy)

**Status:** Working, tested Canvas fallback. WebGL2 implementation is committed but **not yet hardware-tested on iPhone Safari**. Numerical optics are stylized, not experimentally calibrated.

## Why WebGL2 instead of rewriting everything in React?

The simulation is already a stateful, tested JavaScript engine. React would organize the inspector but would neither accelerate the cell simulation nor create prism optics by itself. A.9 introduces one purpose-built **WebGL2 fragment shader pipeline** as an optional renderer, while leaving the existing JavaScript simulation, accessible controls, saved palette recipes, and offline standalone HTML operational. Neither CDN nor Web API credentials are needed. A heavier Three.js/R3F upgrade belongs to true 3D crystal geometry, if/when warranted.

## New optical pipeline

- `src/optics.js`: immutable field packing + CPU fallback spectral render + a WebGL2 renderer with inline GLSL ES 3.00 vertex/fragment programs.
- Texture A (RGBA8, NEAREST): per-pixel director angle, radial layer coordinate, palette address derived from grain/growth history, and occupancy + persistent grain seam.
- Texture B: all 256 interpolated positions of the *artist's current palette*, preserving 2-, 5-, 8-, and 12-stop choices, with independent editable stops.
- GPU shader: crossed-polarizer-inspired factor `sin²(2*(director - analyzer))`, per-channel retarder factor `sin²(phase(lambda)/2)`, spectral palette sampling offsets, a local director gradient signal, and grain-contact highlights.
- CPU fallback applies analogous equations when WebGL2 is not available, on any `canvas` browser supporting ImageData. It does not require GPU support.
- Context loss/errors cause a fallback, rather than a missing artwork. GPU frames are cached on the existing 2D image layer.

## NEW touch interaction — Twist Light

- Choose a grown spherulite/rosette/astral fan; select **TWIST LIGHT** below the artwork and drag.
- `SpheruliteField.twistOptics(x,y,radius,strength)` modifies existing per-cell optical directors in a spatially weighted brush, incrementing material render version.
- **It does not change crystal occupancy, grain IDs, nutrient, heat, age, or future growth mechanics.** Material and optical fields are separate.
- Undo restores the full director field because it is included in the existing spherulite snapshot. Restart and Refresh retain their existing confirmation behavior.
- Current optical brush affects *only the radial spherulite family*. Phase-field and tip-only species are intentionally untouched.

## New controls (FINISHES)

- Select `OPTICAL HERESY · SPECTRAL SEPARATION`.
- Existing analyzer angle / optical path / crossed contrast stay operational.
- Prismatic RGB separation: displaces per-channel palette sampling.
- Crystal defect highlights: shows stored field discontinuities and grain-contact boundaries.
- Touch twist strength: changes optical-brush influence without changing material.
- Renderer: Auto GPU, WebGL2 GPU, or Canvas 2D compatibility; graceful Canvas fallback if GPU fails. Renderer choice never affects the simulation.
- Status indicator reflects which rendering path actually drew the last optical frame.

## Scientific honesty

This is *an artistic analogy of crossed-polarized crystal microscopy.* The model approximates three RGB wavelengths, a stylized radial optical path, and director-gradient scattering. It is not a quantitative Jones-matrix birefringence stack, thin-film Fresnel renderer, polarization tomography, photorealistic caustic solver, or physically accurate 3D optics. The growth and orientation fields are actual persistent mathematical state.

## Tests

- 70/70 Node tests: the 63 prior tests and 7 tests for packed orientation pixels, spectral responsiveness, pure optical rendering, material preservation, full undo restoration, inert blank/zero twists, bounded defects.
- Automated browser checks on 1300px and 390px layouts: toggled spectral finish and WebGL2/CPU choices, verified fallback on WebGL-disabled headless Chromium, touch rotation, no geometric modification, complete undo.
- **Limitations:** The browser in this container does not expose WebGL1 or WebGL2 even under SwiftShader flags. The GPU shader is included and statically inspected, but has not executed here. Real iPhone Safari and actual WebGL2 GPU performance must be tested before describing that path as verified.
- **Palette fidelity:** GitHub published standalone includes exact canonical 194-entry MATHEMAGICAL vault plus the five original crystal palettes (199 total), all original stops intact. The local browser test fixture intentionally contains fewer recipes; it must never replace GitHub `src/palette-vault.js`.

## What's next

A.10 can explore optically meaningful **3D thickness geometry** with Three.js or R3F, or a faster WebGL2 pipeline retaining GPU output as an independent overlay canvas to avoid 2D compositing readback. At that stage we should profile Safari GPU/CPU use before adding features.
