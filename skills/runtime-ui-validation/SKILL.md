---
name: runtime-ui-validation
description: "Validate the actual React/Vite runtime UI with typecheck, tests, browser rendering, and screenshots."
---

# Runtime UI Validation Skill

## Trigger

當使用者要求：

- 「目前 UI 實際跑起來長什麼樣」
- 「給我看現在程式碼的畫面」
- 「跑起來截圖」

## Core rule


如果使用者問「目前程式實際跑起來」，唯一可接受的基準是執行目前 Git commit 的 React/Vite app。

## Preferred workflow

1. 確認要驗證的 Git SHA。
2. 安裝 dependencies。
3. 跑 TypeScript typecheck。
4. 跑 tests。
5. 啟動 Vite。
6. 使用 headless Chrome 開真正的 app URL。
7. 等本地 font / assets 載入。
8. 擷取 screenshot。
9. 清楚標示 screenshot 對應的 commit SHA。

Repository 已有：

`.github/workflows/ui-screenshot.yml`

目前 workflow 會執行：

- `npm install`
- `npm run typecheck`
- `npm run test`
- Vite dev server
- headless Chrome screenshot

## Important limitation

`UI Screenshot` workflow 目前**不執行** `npm run build`。

因此：

- 可宣稱 typecheck/test/runtime render 通過。
- 不可因此宣稱 production build 已通過。

release / build validation 應另外跑：

```bash
npm run verify
```



- 先取得 runtime screenshot。
- 兩者做差異比較。
