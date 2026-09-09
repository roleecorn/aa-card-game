# Figma Workflow

此 repository 的視覺排版與 UI component 設計同步到 Figma：

https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH

## Source of truth

- **GitHub / TypeScript**：遊戲規則、資料結構、互動邏輯、可執行 React/MUI 實作。
- **Figma**：概念、流程、視覺排版、spacing、尺寸與 component composition。
- **Figma 不負責保存、同步或發布 runtime raster 圖片。** 角色圖與卡牌圖的實際檔案只存在 GitHub runtime asset pipeline。
- 圖片與文字/UI 在程式中仍必須分層；不要把名稱、能力值或技能說明烘焙進圖片。

Figma 不是自動覆寫 production code 的唯一來源。排版在 Figma 修改後，必須經過一次 design-to-code sync，再提交 GitHub commit。

## Figma file structure

目前包含：

- `01 Game Board`：Desktop game board 的 editable screen。
- `02 Components`：CharacterCard、WorkCard、HandCard、DieToken、ScoreBox、ActionButton 等 reusable component。
- `03 Foundations`：palette 與 typography direction。

## 推薦工作流

1. 在 Figma 修改 layout / spacing / typography / component composition。
2. 將修改後的 Figma node URL 提供給 ChatGPT。
3. 由 Figma design context 與 GitHub source 做 diff。
4. 修改 React/MUI component。
5. 執行 typecheck/test/build。
6. commit 到 GitHub。
7. 若 code 的視覺結構也有變動，再同步回 Figma。

這比嘗試讓 Figma 任意變更即時、雙向、自動覆寫 TypeScript 更安全；後者很容易破壞 responsive layout、state-driven UI 與遊戲互動。

## Component mapping

當 Figma component 與 React component 的邊界穩定後，應逐步加入 Figma Code Connect。目標 mapping：

- `CharacterCard` ↔ `src/components/CharacterCard.tsx`
- `DieToken` ↔ `src/components/DieToken.tsx`
- `HandCard` ↔ `src/components/HandCard.tsx`
- `WorkCard` ↔ `src/components/WorkCard.tsx`

Collection component 另外保留：

- `DiceTray`：排列多個 `DieToken`
- `CardHand`：排列多個 `HandCard`
- `WorkBoard`：排列多個 `WorkCard`

Code Connect 只負責 component 對應與 design-to-code context，不代表 Figma 修改會自動部署到程式碼。

## Asset 狀態

Figma 只保留概念／流程／layout 層級的 ART placeholder 或構圖意圖，不同步實際 runtime raster。

角色圖片的唯一 source of truth 是 GitHub `public/assets/characters/`。是否已採用、尺寸、格式與完整性都以 GitHub asset validator 為準；Figma 不參與圖片發布流程。

目前實際 runtime art 完成狀態見 `PROJECT_STATUS.md`。

## Storybook

可獨立檢查 production React component 的 runtime state：

```bash
npm run storybook
```

目前 stories：

- `CharacterCard`：Default / Compact / HighStress / WithActions
- `HandCard`：Support / Event / Tilted
- `DieToken`：Design / Text / AA / Selected
- `WorkCard`：Default / BlueTone / AssigningDie

Figma 處理 design intent；Storybook 顯示真正 React/MUI component 的執行結果。兩者應保持相同 component boundary。

## Code Connect 狀態

目前 authenticated Figma account 是 Starter plan 的 View seat。正式 Figma Code Connect 需要可發布 library component 且需要支援 Code Connect 的 Organization / Enterprise setup，因此目前不建立假的 Code Connect mapping。

在 plan/seat 支援前，使用本文件的 1:1 component path 作為 mapping contract。升級後再加入正式 Code Connect。


## Runtime UI validation

若使用者問「目前程式實際跑起來長什麼樣」，必須先跑指定 Git SHA 的 Vite app 並用 browser/Chrome 擷取真正 runtime screenshot，再與 Figma 比較。Figma screenshot 不能代替 runtime screenshot。

詳細流程：`skills/runtime-ui-validation/SKILL.md`。
