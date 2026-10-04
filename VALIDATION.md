# Validation

最後更新：2026-09-20

## Canonical repository validation

Fresh checkout 的主要驗證入口是：

```bash
npm ci
npm run verify
```

`npm run verify` 本身負責完整且固定的順序：

```text
npm run art:normalize
npm run art:validate
npm run test
npm run build
```

`art:normalize` 是 verify 的正式一部分，不再由 CI 私下額外補做。原因是 character compact 是 portrait 的 generated derivative，而目前 Git tree 仍保留 13 個待人工 refresh 的歷史 384×512 compact binary；fresh checkout 必須先 normalize 才能得到 canonical runtime 384×320 derivatives。

若只修改 asset 規範或美術，可先跑 focused checks：

```bash
npm run test:assets
npm run art:normalize
npm run art:validate
```

所有 asset family、路徑 ownership、legacy exception 與新增 gate 以 `ASSET_CONVENTIONS.md` 為準。

## CI / release pipeline

PR / main / release CI：

1. install dependencies；
2. 產生目前 UI font subset；
3. 跑 tutorial focused regression；
4. 執行 `npm run verify`。

因此本地 `npm run verify` 與 CI 的 character-art / test / build 主流程一致，不再存在 CI 才會額外 normalize 的隱藏前置條件。

GitHub Pages release 因最後 build 需要 `--base=/aa-card-game/`，仍保留顯式步驟：font subset → `art:normalize` → `art:validate` → test → release-base build。角色美術順序仍與 canonical pipeline 一致。

## Asset contract coverage

`npm run test:assets` 目前包含：

- `scripts/runtime-assets.test.ts`
  - `public/` / `public/assets/` / character subdirectory registry；
  - character portrait/compact path、pairing、`<character-id>.webp` naming；
  - checked-in Git `HEAD` WebP format、single-frame、sRGB 與 canonical dimensions；
  - 13 個 legacy compact dimension migration ledger，禁止新增第 14 個例外；
  - `src/assets/*.svg` 自包含規則；
  - scratch/backup 檔阻擋；
  - deployment-base-safe public asset references；
  - docs reference art 不得被 runtime import；
  - font family / WOFF2 signature / `.gitattributes` text-binary boundary。
- `scripts/card-art-style.test.ts`
  - 所有 `CARDS`（不只 `BASE_DECK`）都必須引用 canonical individual SVG；
  - 768×480 canvas、rounded frame、`bg` / `paper` / `crayon` structure；
  - 禁止 raster `<image>`、baked `<text>`、script/foreignObject、external URL；
  - `public/assets/cards/` 必須和 `CARDS[].art` 唯一檔案集合完全一致，禁止 orphan / missing art。

## Character asset state

目前角色數為 39：

- portrait：39/39 checked-in binary 已符合 768×1024 WebP、sRGB、single-frame；
- compact：26/39 checked-in binary 已符合 384×320；
- 另 13 個歷史 compact checked-in binary 仍為 384×512，但仍必須是 `<character-id>.webp`、WebP、sRGB、single-frame。

13 個 dimension exception 的完整清單與 migration 規則記錄在 `ASSET_CONVENTIONS.md`。CI / release runtime output 經 `art:normalize` 後會驗證為 39/39 canonical compact。這些 exception 只允許減少，不允許新增；人工 refresh 任一 binary 時，同一 commit 必須同步移除 exception。

實際壓縮後檔案大小不要求相同。validator 會檢查 WebP RIFF 宣告長度與實際 bytes，檔案存在不代表 binary 完整。

## Historical character-art repair note

2026-09-09 audit 曾確認以下四張 WebP 發生 binary 截斷：

- `happy.webp`
- `triangle.webp`
- `fengyang.webp`
- `chaos.webp`

症狀是 GitHub 上檔案存在，但 RIFF header 宣告的總長度大於實際 Git blob bytes，因此 GitHub 無法預覽。當時以 Repair Character Art workflow run `34302878793` 重組既有素材並完成 normalize / validate / typecheck / tests / build。

這段保留為 incident history；目前 canonical 規則與實際驗證入口以上述 asset registry / `npm run verify` 為準。

## Tutorial regression checklist

教學關卡同時是主要遊戲系統與能力機制的 regression fixture。只要改動會影響遊戲規則或玩家操作，就必須確認教學仍可依固定流程完成。

至少檢查：

- 固定我方／敵方 roster 仍合法，且教學能力的 target 條件仍有可選目標。
- 固定起手牌與 deck order 沒有因卡牌 ID、抽牌規則或初始效果改動而失效。
- deterministic RNG 仍可重現預期骰子結果與相關隨機效果。
- 角色技能、卡牌、effect、condition、target、骰子、作品進度、壓力／resource、phase 或 AI 改動後，既有 tutorial steps 仍與實際 runtime 行為一致。
- 每一步的 click restriction 與 highlight anchor 仍指向可操作元素；target dialog 的開啟、取消、選擇與完成不會造成教學卡死。
- 若系統改動刻意改變教學所示範的流程或能力，必須同步更新 tutorial content、step 定義與 deterministic tests。

教學相關 unit / deterministic tests 是基本要求；若 selector、dialog、layout 或實際點擊流程受到影響，還需要執行 runtime UI 驗證，不能只以 test pass 判定教學正常。
