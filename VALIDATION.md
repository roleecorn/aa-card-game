# Validation

最後更新：2026-09-10

## Character art repair

2026-09-09 audit 確認先前四張 WebP 曾發生 binary 截斷：

- happy.webp
- triangle.webp
- fengyang.webp
- chaos.webp

症狀是 GitHub 上檔案存在，但 RIFF header 宣告的總長度大於實際 Git blob bytes，因此 GitHub 無法預覽。

修復採 GitHub-side staging/reassembly，避免再次透過 connector 直接傳大型 binary。

Repair Character Art workflow run `34302878793` 已成功執行：

- 重新組合既有美術素材
- `npm install`
- `npm run art:normalize`
- `npm run art:validate`
- `npm run typecheck`
- `npm run test`
- `npm run build`

驗證用 staging head：

`fe4f1371234cce299199bf0de8ea53518380e189`

## Character assets

目前 10 張角色 portrait 都符合 runtime canonical format：

- WebP
- 768×1024
- 3:4
- sRGB
- single-frame
- RIFF 宣告長度與實際檔案 bytes 一致

實際壓縮後檔案大小不要求相同。

Pintbox、79、真白、銀櫻、旁白、藍風是由既有 legacy-quality 素材規範化為 768×1024 runtime derivative；這次沒有重新生成美術，因此不代表原始細節品質被提升。

## Repository validation

`npm run verify` 現在會先執行：

```text
npm run art:validate
npm run test
npm run build
```

`UI Screenshot` workflow 也會先執行 `art:validate`，再跑 typecheck、Vitest、Vite 與 Chrome runtime render。

角色內容仍遵守 atomic package 規則；runtime UI 驗證必須使用真正 Vite/Chrome screenshot，不以 Figma 代替。

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
