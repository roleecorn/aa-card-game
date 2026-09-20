# Asset Conventions and Registry

本文件是 repository **所有已追蹤 runtime / reference asset family 的總表**。細部畫風可以由專屬文件管理，但格式、ownership、路徑與新增 gate 以本文件為入口。

## 1. Registry-first 原則

新增任何 asset 前先做兩件事：

1. 找到職責最接近的既有 asset / component / generator 當 reference。
2. 確認它已屬於下表某個 family；若不屬於，**先更新本文件與對應 validation，再新增檔案**。

不得因工具方便在同一 runtime role 平行建立第二種格式。不得把暫存、轉檔中間產物或 mockup 放入 runtime asset directory。

## 2. Canonical asset registry

| Family | Canonical path | Format / geometry | Source of truth | Validation / detail |
| --- | --- | --- | --- | --- |
| Individual card illustration | `public/assets/cards/<card>.svg` | UTF-8 SVG, `viewBox="0 0 768 480"` | SVG source itself | `CARD_ART_STYLE.md`, `scripts/card-art-style.test.ts` |
| Character portrait | `public/assets/characters/portrait/<id>.webp` | WebP, 768×1024, sRGB, single frame | portrait binary | `CHARACTER_CARD_ART.md`, `npm run art:validate` |
| Character compact derivative | `public/assets/characters/compact/<id>.webp` | WebP, 384×320, sRGB, single frame | generated from portrait by `npm run art:normalize` with `cover` | `CHARACTER_CARD_ART.md`, `npm run art:validate` |
| Bundled UI vector | `src/assets/*.svg` | self-contained SVG with `viewBox`; no embedded raster/external dependency | SVG source itself | `scripts/runtime-assets.test.ts` |
| Bundled UI font | `public/fonts/noto-sans-tc-ui.woff2` | WOFF2 variable subset, weights 100–900 | generated subset from pinned Noto Sans TC source | `public/fonts/README.md`, `scripts/vendor-ui-font.sh` |
| Documentation reference art | `docs/art/*` | reference-only; runtime format rules do not apply | documentation | must never be imported by runtime source |

### Current bundled UI vector reference

`src/assets/work-slot-complete-stamp.svg` is the canonical work-slot completion mark. It uses a 96×96 viewBox, pink rubber-stamp geometry, and is imported by `WorkCard.tsx` through the module bundler. The old duplicate `public/assets/work-slot-complete-stamp.png` is removed; do not recreate a public raster fallback for the same role.

### Removed legacy card-category rasters

`public/assets/cards/coordination.png` and `event.png` were not referenced by runtime code and had inconsistent widths (237×450 vs 253×450). They are intentionally removed rather than standardized. A future category illustration is a **new family** and needs a registry/spec decision first.

## 3. Public path ownership

- Content references to `public/` assets are repository-relative, e.g. `assets/characters/portrait/pintbox.webp`.
- Browser URLs are resolved through `import.meta.env.BASE_URL` or the shared `resolvePublicAssetPath` boundary.
- Components must not hard-code root-absolute `'/assets/...'` paths.
- `src/assets/*` is different: these assets are imported as modules and handled by Vite; do not duplicate the same role under `public/` as a fallback.

## 4. Binary vs text asset boundary

- SVG and documentation are UTF-8 text assets and can be reviewed through normal source diffs.
- WebP / PNG / WOFF2 are binary. AI agents do not upload or replace image binary through GitHub; character binary delivery follows `AGENTS.md` / `CHARACTER_CARD_ART.md`.
- Generated font refresh follows `public/fonts/README.md` and its dedicated workflow.
- `*.tmp`, `*.bak`, editor backup files, conversion intermediates, archives, and generated scratch files are never source assets.

## 5. Visual/reference rules

- **Card SVG:** closest existing card SVG is mandatory reference; see `CARD_ART_STYLE.md`.
- **Character art:** visual brief and portrait constraints live in `CHARACTER_CARD_ART.md`; compact is currently a derived artifact, not an independently authored image.
- **UI vector:** use the closest existing UI vector/component. If a new asset introduces a distinct visual family rather than a one-off icon, document that subfamily here before adding it.
- **Documentation reference art:** may preserve external/reference appearance, but cannot silently become runtime art.

## 6. Automated enforcement

`scripts/runtime-assets.test.ts` enforces the repository-level contract:

- only registered directories exist under `public/assets`;
- card runtime assets are SVG-only;
- portrait/compact directories contain exactly the assets referenced by `CHARACTERS` and no temp files;
- `src/assets` is SVG-only, with a `viewBox`, no `<image>` raster embedding, and no external URL dependency;
- production `src/` code does not hard-code root-absolute `/assets/...` literals;
- runtime code does not reference `docs/art`;
- the public font directory keeps the canonical font/license/readme set and a valid WOFF2 signature.

Family-specific checks continue to run as well:

- `scripts/card-art-style.test.ts`
- `npm run art:validate`
- `src/tests/public-asset-path.test.ts`

Run focused asset checks with:

```bash
npm run test:assets
npm run art:validate
```

Normal `npm run test` / CI also includes the asset tests.

## 7. Adding a new asset family

If an asset cannot fit an existing row without weakening that row's semantics:

1. identify why no existing reference/family is appropriate;
2. define canonical path, format, dimensions/viewBox, ownership, runtime loading method and visual reference;
3. add validation that rejects accidental alternate formats;
4. update `AGENTS.md` / relevant detail spec if contributor behavior changes;
5. only then add the first asset of that family.

This gate is intentional: **a file existing in the repository is not, by itself, a precedent.** Temporary, legacy, unused, or inconsistent assets must not become a convention merely because they were previously committed.
