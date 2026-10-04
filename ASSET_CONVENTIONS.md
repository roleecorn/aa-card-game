# Asset Conventions and Registry

本文件是 repository **所有已追蹤 runtime / reference asset family 的總表**。細部畫風可以由專屬文件管理，但格式、ownership、路徑與新增 gate 以本文件為入口。

## 1. Registry-first 原則

新增任何 asset 前先做兩件事：

1. 找到職責最接近的既有 asset / component / generator 當 reference。
2. 確認它已屬於下表某個 family；若不屬於，**先更新本文件與對應 validation，再新增檔案**。

不得因工具方便在同一 runtime role 平行建立第二種格式。不得把暫存、轉檔中間產物或 mockup 放入 runtime asset directory。

`public/` 本身也是 registry 邊界：目前只允許 `assets/` 與 `fonts/` 兩個正式 family root。若未來需要 favicon、manifest、音訊或其他公開檔案，必須先在本文件新增 family，而不是直接把檔案丟進 `public/` 根目錄。

## 2. Canonical asset registry

| Family | Canonical path | Format / geometry | Source of truth | Validation / detail |
| --- | --- | --- | --- | --- |
| Individual card illustration | `public/assets/cards/<card>.svg` | UTF-8 SVG, `viewBox="0 0 768 480"` | SVG source itself | `CARD_ART_STYLE.md`, `scripts/card-art-style.test.ts` |
| Character portrait | `public/assets/characters/portrait/<id>.webp` | WebP, 768×1024, sRGB, single frame | portrait binary | `CHARACTER_CARD_ART.md`, `npm run art:validate` |
| Character compact derivative | `public/assets/characters/compact/<id>.webp` | WebP, 384×320, sRGB, single frame | generated from portrait by `npm run art:normalize` with `cover` | `CHARACTER_CARD_ART.md`, `npm run art:validate` |
| Bundled UI vector | `src/assets/*.svg` | self-contained SVG with `viewBox`; no embedded raster/external dependency | SVG source itself | `scripts/runtime-assets.test.ts` |
| Bundled UI font | `public/fonts/noto-sans-tc-ui.woff2` | WOFF2 variable subset, weights 100–900 | generated subset from pinned Noto Sans TC source | `public/fonts/README.md`, `scripts/vendor-ui-font.sh` |
| Documentation reference art | `docs/art/*` | reference-only; runtime format rules do not apply | documentation | must never be imported by runtime source |

### Checked-in character binary audit (2026-10-05)

`portrait` 39/39 符合 768×1024，`compact` 39/39 符合 384×320。原有 13 張 384×512 compact 已依本次使用者明確授權，由各自的 canonical portrait 透過既有 `scripts/image-tools.ts` 的 `convertToWebp` 產生；沿用 `scripts/character-art.ts` 的 cover、quality 82、alphaQuality 90、effort 6 設定。歷史尺寸例外已清零，不再接受 384×512。

- `npm run art:validate` 可直接驗證 checkout 中的 39/39 portrait 與 compact，包含 WebP RIFF 長度、尺寸、單幀與 sRGB。
- CI / release 仍維持 `art:normalize` → `art:validate` 順序。
- `scripts/runtime-assets.test.ts` 直接讀取 Git `HEAD` 的 binary metadata，所有 portrait / compact 均須符合 canonical dimensions，沒有尺寸 allowlist。
- Git metadata audit 使用單次 `git cat-file --batch`，避免 Windows 逐張啟動 Git 造成逾時；該次呼叫只信任目前 checkout 的絕對路徑，不變更 global Git 設定。

本次僅修正 compact derivative 的尺寸與驗證，不改變遊戲規則或角色數據。

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

- **Card SVG:** closest existing card SVG is mandatory reference; see `CARD_ART_STYLE.md`. `CARDS` is the authoritative supported-card set; being absent from `BASE_DECK` does not exempt a compatibility card from the art contract.
- **Character art:** visual brief and portrait constraints live in `CHARACTER_CARD_ART.md`; compact is currently a derived artifact, not an independently authored image.
- **UI vector:** use the closest existing UI vector/component. If a new asset introduces a distinct visual family rather than a one-off icon, document that subfamily here before adding it.
- **Documentation reference art:** may preserve external/reference appearance, but cannot silently become runtime art.

## 6. Automated enforcement

`scripts/runtime-assets.test.ts` enforces the repository-level contract:

- `public/` contains only registered family roots (`assets`, `fonts`);
- `public/assets` contains only `cards` and `characters`, and `public/assets/characters` contains only `portrait` and `compact`;
- portrait/compact directories contain exactly the assets referenced by `CHARACTERS` and no temp files;
- character portrait/compact filenames must equal `<character-id>.webp`;
- checked-in character binaries must be single-frame sRGB WebP; portrait dimensions must all be canonical, while checked-in compact dimension exceptions must exactly match the migration ledger above;
- `src/assets` is SVG-only, with a `viewBox`, no `<image>` raster embedding, and no external URL dependency;
- production `src/` code does not hard-code root-absolute `/assets/...` literals;
- runtime code does not reference `docs/art`;
- the public font directory keeps the canonical font/license/readme set and a valid WOFF2 signature.

`scripts/card-art-style.test.ts` separately enforces the complete `CARDS` art set:

- every card definition has canonical `assets/cards/*.svg` art, including compatibility cards outside `BASE_DECK`;
- every SVG keeps the canonical 768×480 canvas, rounded frame, `bg`, `paper`, and `crayon` structure;
- no raster embedding, baked `<text>`, executable/foreign document content, or external URL dependency;
- `public/assets/cards/` must exactly equal the unique art files referenced by `CARDS`, so orphan art and missing art both fail.

Family-specific checks continue to run as well:

- `scripts/card-art-style.test.ts`
- `npm run art:validate`
- `src/tests/public-asset-path.test.ts`

Run focused asset checks with:

```bash
npm run test:assets
npm run art:normalize
npm run art:validate
```

Normal `npm run test` / CI also includes the asset tests。角色 binary 的 canonical-dimension 驗證則維持在 `art:normalize` 後執行 `art:validate`；這是因為 compact 是 portrait 的 generated derivative，而不是另一個可自由定義尺寸的 source family。

## 7. Adding a new asset family

If an asset cannot fit an existing row without weakening that row's semantics:

1. identify why no existing reference/family is appropriate;
2. define canonical path, format, dimensions/viewBox, ownership, runtime loading method and visual reference;
3. add validation that rejects accidental alternate formats;
4. update `AGENTS.md` / relevant detail spec if contributor behavior changes;
5. only then add the first asset of that family.

This gate is intentional: **a file existing in the repository is not, by itself, a precedent.** Temporary, legacy, unused, or inconsistent assets must not become a convention merely because they were previously committed.
