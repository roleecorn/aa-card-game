# Card Art SVG Specification

This document defines the canonical runtime illustration style for individual cards under `public/assets/cards/`.
It is derived from the repository's existing card SVGs; it is not a new visual direction.

## 1. Reference-first rule

Before adding a new card illustration, identify at least one existing card SVG that already solves the closest visual problem.
The new asset must follow that file family's format, composition language, filters, stroke treatment, and naming conventions.

If no suitable reference exists, do not invent a new asset format or visual language first. Document the missing convention here, review it, and only then add the new asset.

`public/assets/cards/` is reserved for individual runtime card SVGs. The historical `coordination.png` / `event.png` category rasters were unused, had inconsistent dimensions, and are removed rather than promoted into a second card-art convention. A future card-category visual must first be registered as a new asset family in `ASSET_CONVENTIONS.md`.

## 2. Canonical SVG structure

Existing references: `soothe.svg`, `guide.svg`, `voice.svg`, `polish.svg`, `rush.svg`, `overtime.svg`, `writer-block.svg`.

Every individual card illustration should follow these constraints:

| Item | Canonical rule |
| --- | --- |
| Format | UTF-8 SVG text |
| Location | `public/assets/cards/<kebab-case-name>.svg` |
| Canvas | `viewBox="0 0 768 480"` (8:5) |
| Outer frame | `<rect width="768" height="480" rx="28" ... />` |
| Background | simple diagonal `linearGradient` named `bg` |
| Surface texture | `paper` filter using `feTurbulence` + `feBlend`, opacity about `.22` |
| Drawn texture | `crayon` filter using `feTurbulence` + `feDisplacementMap`, scale about `5` |
| Main group | `filter="url(#crayon)"`, round line caps and joins |
| Shape language | small number of simple circles / rects / paths / ellipses |
| Stroke language | broad, rounded strokes; generally about 7–26 px |
| Text | no baked card name, rule text, labels, or readable UI text |
| Raster embedding | forbidden: no `<image>` and no base64/embedded raster |
| External dependencies | none: no external fonts, images, scripts, or URLs |

Do not convert generated raster art into SVG wrappers. The visual must be authored as vector shapes following the existing files.

## 3. Palette and composition

### Coordination cards

Use the light pastel family established by `soothe.svg`, `guide.svg`, `voice.svg`, `polish.svg`, and `rush.svg`:

- pale blue / cream / mint / lavender / peach backgrounds;
- friendly or constructive symbolic scenes;
- dark muted outlines rather than black photographic detail;
- clear central silhouette that remains readable at card size.

### Event cards

Use the disruption/blocking family established by `overtime.svg` and `writer-block.svg`:

- darker, greyer, or more desaturated gradients;
- stronger contrast and obstruction / malfunction / interruption motifs;
- the same simplified geometry and rounded crayon strokes as coordination art.

Event art may still use a lighter muted background when the closest existing reference does so; `writer-block.svg` is the precedent.

## 4. Traceable references for the 2026-09-19 cards

| New asset | Existing references | Reason |
| --- | --- | --- |
| `one-on-one.svg` | `guide.svg`, `voice.svg` | two-person interaction + meeting/table composition |
| `inspiration.svg` | `polish.svg`, `rush.svg` | spark motif + energetic coordination palette/motion |
| `accident.svg` | `overtime.svg` | dark office disruption/event composition |
| `tech-failure.svg` | `writer-block.svg`, `overtime.svg` | device/desk motif + dark event palette |
| `thought-block.svg` | `writer-block.svg` | blocked-creation metaphor + muted event palette |

Each newly authored SVG should include a short source comment naming its reference SVGs so the visual lineage remains inspectable without reading commit history.

## 5. Automated enforcement

`scripts/card-art-style.test.ts` protects the established convention for Standard-deck card art. It verifies that:

- every Standard-deck card points to `assets/cards/*.svg`;
- every referenced card SVG uses the canonical `0 0 768 480` viewBox;
- every referenced card SVG retains the `paper` and `crayon` texture definitions;
- individual card SVGs do not embed raster content through `<image>`;
- the 2026-09-19 additions retain comments naming their approved existing reference SVGs.

This test is a guardrail, not a substitute for visual review. A technically valid SVG can still be rejected in review if its composition, palette, stroke language, or visual hierarchy does not match the cited references.

## 6. Implementation workflow

1. Read this file and inspect the named reference SVG(s).
2. Reuse the established 768×480 skeleton and texture filters.
3. Build the scene from simple vector primitives; do not start from raster image generation.
4. Render locally and inspect at both full size and card-sized scale.
5. Keep the content definition using `cardArt('<name>.svg')`.
6. Run the card-art style regression plus normal `typecheck`, `test`, and `build`.

A new visual category or alternate format requires an explicit specification update before assets are added.
