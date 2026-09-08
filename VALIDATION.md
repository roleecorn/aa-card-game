# Validation

最後更新：2026-09-09

## 最近完整 runtime 驗證

最近驗證的角色內容 chain head：76c2e50a79b21d1349940dd034f3f3462843cab0

GitHub Actions：
- UI Screenshot run 34256722438 — success
- Vendor UI Font run 34256722608 — success

UI Screenshot 實際執行：npm install、npm run typecheck、npm run test、Vite dev server、headless Chrome runtime render、screenshot artifact。

因此可以確認 TypeScript typecheck、Vitest、Vite startup 與 Chrome runtime render 已通過。

## Production build 界線

UI Screenshot workflow 目前沒有執行 npm run build，因此不能把 screenshot workflow success 寫成 production build 已通過。

release 前應另外執行 npm run verify；verify 會執行 test + build。

## Character assets

目前 10 個 portrait path 都有實際檔案。

符合正式 768×1024：happy.webp、triangle.webp、fengyang.webp、chaos.webp。

仍是 192×256 legacy-size：pintbox.webp、user79.webp、mashiro.webp、ginsakura.webp、narrator.webp、bluewind.webp。

六張 legacy-size 圖比例是 3:4，但不符合目前正式解析度規格；不可宣稱全部角色圖都已完成 768×1024 升級。

## Validation guidance

角色內容先建立完整 atomic commit，在 temporary validation branch 跑 CI，成功後 fast-forward 同一個 commit 到 main。

UI 驗證必須取得真正 Vite/Chrome screenshot，再與 Figma 比較。
