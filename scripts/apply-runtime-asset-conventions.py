from pathlib import Path
import json


def replace_one(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one match, found {count}: {old[:80]!r}')
    path.write_text(text.replace(old, new), encoding='utf-8')


# 1) WorkCard: one canonical bundled SVG, no public PNG / root-absolute path / fallback duplication.
work = Path('src/components/WorkCard.tsx')
replace_one(
    work,
    "import workSlotCompleteStampFallback from '../assets/work-slot-complete-stamp.svg';",
    "import workSlotCompleteStamp from '../assets/work-slot-complete-stamp.svg';",
)
replace_one(work, "const workSlotCompleteStamp = '/assets/work-slot-complete-stamp.png';\n", "")
replace_one(
    work,
    """          onError={(event) => {\n            const image = event.currentTarget;\n            if (image.dataset.fallbackApplied === 'true') return;\n            image.dataset.fallbackApplied = 'true';\n            image.src = workSlotCompleteStampFallback;\n          }}\n""",
    "",
)

# 2) Ignore editor / conversion leftovers globally.
gitignore = Path('.gitignore')
replace_one(
    gitignore,
    "# Temporary / generated local files\n.tmp/\ntmp/\n*.local\n",
    "# Temporary / generated local files\n.tmp/\ntmp/\n*.tmp\n*.bak\n*~\n*.local\n",
)

# 3) Character art documentation: align with the actual normalize pipeline.
character_art = Path('CHARACTER_CARD_ART.md')
replace_one(
    character_art,
    "5. 完成後可在本地 resize / crop / convert / validate，整理成 portrait / compact 與 ZIP。",
    "5. 完成後可在本地 resize / convert / validate；`portrait` 是 canonical source，`compact` 由 `npm run art:normalize` 依目前 pipeline 以 `cover` 衍生，再整理成 ZIP。",
)
replace_one(
    character_art,
    "| Compact slot 尺寸 | 384 x 320 px（僅需要橫向構圖的角色） |",
    "| Compact slot 尺寸 | 384 x 320 px（目前所有角色皆由 canonical portrait 透過 `art:normalize` 以 `cover` 衍生） |",
)
replace_one(
    character_art,
    "| 位置 | `public/assets/characters/` |",
    "| 位置 | portrait：`public/assets/characters/portrait/`；compact：`public/assets/characters/compact/` |",
)
replace_one(
    character_art,
    "`compactPortrait` 是為主畫面橫向 slot 重新構圖的獨立正式素材，不得由 3:4 portrait 機械裁切或補邊。角色資料頁仍使用標準 `portrait`，compact 卡片優先使用 `compactPortrait`。",
    "`compactPortrait` 目前不是獨立 source-of-truth；repository 的 canonical pipeline 會由 3:4 `portrait` 以 `cover` 產生 384×320 derivative。角色資料頁使用標準 `portrait`，compact 卡片使用這個 derivative。若未來要允許人工獨立構圖的 compact，必須先修改 `scripts/character-art.ts`、本文件與 validation contract，再新增該做法；不得只手動覆蓋一張 compact，因為下一次 `art:normalize` 會重建它。",
)
replace_one(
    character_art,
    "  portrait: '/assets/characters/portrait/pintbox.webp',\n  compactPortrait: '/assets/characters/compact/pintbox.webp',",
    "  portrait: 'assets/characters/portrait/pintbox.webp',\n  compactPortrait: 'assets/characters/compact/pintbox.webp',",
)
replace_one(
    character_art,
    "5. 本地整理成 768×1024 portrait / 384×320 compact WebP。\n6. 本地完整 decode 並確認尺寸、單幀與 RIFF/container 完整性。\n7. 將 portrait / compact、manifest/checksum 整理成 ZIP 或檔案交給使用者。\n8. 告知使用者應上傳到 `public/assets/characters/portrait/` / `public/assets/characters/compact/` 的確切檔名。\n9. **由使用者手動上傳圖片。** Chat / AI agent 不做 binary GitHub upload。\n10. 使用者上傳後再執行 `npm run art:normalize` / `npm run art:validate`、確認 `CharacterDefinition` reference，並以 `CharacterCard` desktop / narrow layout 驗證。",
    "5. 本地整理 canonical 768×1024 portrait WebP，執行 `npm run art:normalize` 產生 384×320 compact derivative。\n6. 本地完整 decode 並確認 portrait / compact 尺寸、單幀與 RIFF/container 完整性。\n7. 將 portrait、衍生 compact、manifest/checksum 整理成 ZIP 或檔案交給使用者。\n8. 告知使用者應上傳到 `public/assets/characters/portrait/` / `public/assets/characters/compact/` 的確切檔名。\n9. **由使用者手動上傳圖片。** Chat / AI agent 不做 binary GitHub upload。\n10. 使用者上傳後執行 `npm run art:validate`、確認 `CharacterDefinition` 使用 repository-relative reference，並以 `CharacterCard` desktop / narrow layout 驗證。",
)

# 4) Card-art docs and agent rules: cards directory is vector-only; old category PNGs are not a precedent.
card_art = Path('CARD_ART_STYLE.md')
replace_one(
    card_art,
    "The two raster files `coordination.png` and `event.png` are category/UI assets, not precedent for individual card illustrations.\nIndividual runtime card illustrations use SVG.",
    "`public/assets/cards/` is reserved for individual runtime card SVGs. The historical `coordination.png` / `event.png` category rasters were unused, had inconsistent dimensions, and are removed rather than promoted into a second card-art convention. A future card-category visual must first be registered as a new asset family in `ASSET_CONVENTIONS.md`."
)

agents = Path('AGENTS.md')
replace_one(
    agents,
    "- `coordination.png` / `event.png` 是 category/UI asset，不是 individual card illustration 的格式 precedent。",
    "- `public/assets/cards/` 僅放 individual runtime card SVG；舊 `coordination.png` / `event.png` category raster 已因未使用且尺寸不一致而移除，不得當作格式 precedent。",
)
replace_one(
    agents,
    "- 詳細格式、reference mapping 與提交流程見 `CARD_ART_STYLE.md`。",
    "- 詳細格式、reference mapping 與提交流程見 `CARD_ART_STYLE.md`；所有 asset family 的 registry / ownership / validation 見 `ASSET_CONVENTIONS.md`。",
)
replace_one(
    agents,
    "- 使用者新增／替換正式 portrait 後應執行 `npm run art:normalize` 與 `npm run art:validate`。",
    "- 使用者新增／替換正式 portrait 後應執行 `npm run art:normalize` 與 `npm run art:validate`；compact 是目前 pipeline 由 portrait 產生的 derivative，不是獨立 source-of-truth。",
)

# 5) Contributor docs: reference current package layout and asset gate.
contrib = Path('CONTRIBUTING.md')
replace_one(
    contrib,
    "1. 先讀 `CHARACTER_AUTHORING.md` 與 `CHARACTER_CARD_ART.md`。\n2. 在 `src/content/characters.ts` 新增角色資料。\n3. 技能放到 `src/content/skills.ts`，優先使用既有 effect vocabulary。\n4. 若新增全新 mechanic，依 `SKILL_AUTHORING.md` 擴充 schema / EffectRegistry / test。\n5. 不在 Engine 或 UI 裡以角色 ID 寫分支。\n6. 角色必須 atomic commit：數值、文本、runtime effect、tests、portrait 同一個 commit 完成。",
    "1. 先讀 `CHARACTER_AUTHORING.md`、`CHARACTER_CARD_ART.md` 與 `ASSET_CONVENTIONS.md`。\n2. 在 `src/content/<character-id>.ts` 建立／更新角色 package。\n3. 技能與角色資料維持同一 package，優先使用既有 effect vocabulary。\n4. 若新增全新 mechanic，依 `SKILL_AUTHORING.md` 擴充 schema / EffectRegistry / test。\n5. 不在 Engine 或 UI 裡以角色 ID 寫分支。\n6. data / skill / runtime / tests / docs 應一致；正式 binary art 可使用既有 placeholder 先完成程式提交，正式圖依 `AGENTS.md` 由使用者手動上傳。",
)
replace_one(
    contrib,
    "- 卡牌 runtime 插圖放 `public/assets/cards/`。",
    "- 卡牌 runtime 插圖放 `public/assets/cards/*.svg`，並遵守 `CARD_ART_STYLE.md`。\n- 新增任何既有 registry 之外的 asset family，先更新 `ASSET_CONVENTIONS.md`，不得先提交新格式再補規範。",
)
replace_one(
    contrib,
    "- 角色 package 不可拆成「先資料、後技能、再圖片」的多個 commit。",
    "- 角色 data / skill / runtime / tests / docs 不可拆成互相矛盾的半完成狀態；正式 binary art 依 repository 的人工上傳邊界獨立處理。",
)

# 6) README: expose the asset registry and dedicated asset tests.
readme = Path('README.md')
replace_one(
    readme,
    "- `npm run art:validate`\n\n角色圖完整規格見 [`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)。",
    "- `npm run art:validate`\n- `npm run test:assets`\n\n所有 runtime/reference asset family 的 registry、路徑 ownership 與新增 gate 見 [`ASSET_CONVENTIONS.md`](./ASSET_CONVENTIONS.md)。角色圖完整規格見 [`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)，單卡 SVG 規格見 [`CARD_ART_STYLE.md`](./CARD_ART_STYLE.md)。",
)
replace_one(
    readme,
    "- 角色美術：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)\n",
    "- Asset registry / 共通規範：[`ASSET_CONVENTIONS.md`](./ASSET_CONVENTIONS.md)\n- 角色美術：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)\n- 卡牌 SVG 美術：[`CARD_ART_STYLE.md`](./CARD_ART_STYLE.md)\n",
)

# 7) package script for focused checks.
package_path = Path('package.json')
package = package_path.read_text(encoding='utf-8')
old = '    "test:tutorial": "vitest run src/tests/tutorial.test.ts",\n'
new = old + '    "test:assets": "vitest run scripts/card-art-style.test.ts scripts/runtime-assets.test.ts",\n'
if package.count(old) != 1:
    raise RuntimeError('package.json: test:tutorial anchor mismatch')
package_path.write_text(package.replace(old, new), encoding='utf-8')

# 8) Umbrella registry. No asset file may exist outside these families without updating this first.
Path('ASSET_CONVENTIONS.md').write_text(r'''# Asset Conventions and Registry

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
''', encoding='utf-8')

# 9) Repository-level contract tests.
Path('scripts/runtime-assets.test.ts').write_text(r'''import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/content/catalog';

const ROOT = process.cwd();
const abs = (...parts: string[]) => path.join(ROOT, ...parts);

async function entries(dir: string) {
  return fs.readdir(abs(dir), { withFileTypes: true });
}

async function filesRecursive(dir: string): Promise<string[]> {
  const root = abs(dir);
  const out: string[] = [];
  async function walk(current: string) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(path.relative(ROOT, full).replaceAll('\\', '/'));
    }
  }
  await walk(root);
  return out.sort();
}

async function productionSourceFiles(): Promise<string[]> {
  const all = await filesRecursive('src');
  return all.filter((file) => /\.(?:ts|tsx|css)$/.test(file) && !file.includes('/tests/') && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'));
}

function basenames(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value)).map((value) => path.posix.basename(value)).sort();
}

describe('runtime asset registry', () => {
  it('keeps public/assets limited to registered card and character families', async () => {
    const rootEntries = await entries('public/assets');
    expect(rootEntries.map((entry) => entry.name).sort()).toEqual(['cards', 'characters']);
    expect(rootEntries.every((entry) => entry.isDirectory())).toBe(true);

    const cardFiles = await filesRecursive('public/assets/cards');
    expect(cardFiles.length).toBeGreaterThan(0);
    expect(cardFiles.every((file) => file.endsWith('.svg'))).toBe(true);
  });

  it('keeps character directories exact, paired and free of scratch files', async () => {
    const expectedPortraits = basenames(Object.values(CHARACTERS).map((character) => character.portrait));
    const expectedCompacts = basenames(Object.values(CHARACTERS).map((character) => character.compactPortrait));
    const actualPortraits = (await entries('public/assets/characters/portrait')).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    const actualCompacts = (await entries('public/assets/characters/compact')).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();

    expect(actualPortraits).toEqual(expectedPortraits);
    expect(actualCompacts).toEqual(expectedCompacts);
    expect(actualPortraits.every((name) => /^[a-z0-9-]+\.webp$/.test(name))).toBe(true);
    expect(actualCompacts.every((name) => /^[a-z0-9-]+\.webp$/.test(name))).toBe(true);
  });

  it('keeps source-bundled UI assets vector-only and self-contained', async () => {
    const uiAssets = await filesRecursive('src/assets');
    expect(uiAssets.length).toBeGreaterThan(0);
    for (const file of uiAssets) {
      expect(file.endsWith('.svg'), `${file} must be SVG`).toBe(true);
      const source = await fs.readFile(abs(file), 'utf8');
      expect(source, `${file} must have a viewBox`).toMatch(/<svg\b[^>]*\bviewBox=/i);
      expect(source, `${file} must not embed raster images`).not.toMatch(/<image\b/i);
      expect(source, `${file} must not depend on external URLs`).not.toMatch(/https?:\/\//i);
    }
  });

  it('rejects tracked scratch/backup files from runtime asset trees', async () => {
    const runtimeFiles = [
      ...(await filesRecursive('public/assets')),
      ...(await filesRecursive('src/assets')),
    ];
    expect(runtimeFiles.filter((file) => /(?:\.tmp|\.bak|~)$/i.test(file))).toEqual([]);
  });

  it('keeps production public-asset references deployment-base-safe', async () => {
    const offenders: string[] = [];
    for (const file of await productionSourceFiles()) {
      const source = await fs.readFile(abs(file), 'utf8');
      if (/['"]\/assets\//.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps documentation reference art out of runtime source', async () => {
    const offenders: string[] = [];
    for (const file of await productionSourceFiles()) {
      const source = await fs.readFile(abs(file), 'utf8');
      if (/docs\/art\//.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the bundled UI font family explicit and licensed', async () => {
    const fontEntries = (await entries('public/fonts')).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    expect(fontEntries).toEqual(['OFL.txt', 'README.md', 'noto-sans-tc-ui.woff2']);
    const font = await fs.readFile(abs('public/fonts/noto-sans-tc-ui.woff2'));
    expect(font.subarray(0, 4).toString('ascii')).toBe('wOF2');
  });
});
''', encoding='utf-8')

# 10) Delete files that the audit proved are unused, duplicate, or scratch artifacts.
for rel in [
    'public/assets/cards/coordination.png',
    'public/assets/cards/event.png',
    'public/assets/work-slot-complete-stamp.png',
    'public/assets/characters/compact/bluewind.webp.tmp',
    'public/assets/characters/compact/ginsakura.webp.tmp',
    'public/assets/characters/compact/mashiro.webp.tmp',
    'public/assets/characters/compact/narrator.webp.tmp',
    'public/assets/characters/compact/pintbox.webp.tmp',
    'public/assets/characters/compact/user79.webp.tmp',
]:
    p = Path(rel)
    if not p.exists():
        raise RuntimeError(f'missing audited cleanup target: {rel}')
    p.unlink()

print('Runtime asset conventions applied.')
