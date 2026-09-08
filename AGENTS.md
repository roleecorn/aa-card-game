# AGENTS.md

本檔案定義 AI coding agent 在此 repository 內工作的基本規範。若子目錄未來需要更特殊的規則，可在子目錄新增自己的 `AGENTS.md` 覆蓋較上層規則。

## 技術基線

- 使用 **TypeScript**。不要把主要遊戲邏輯改回 JavaScript。
- UI 使用 **React + MUI**；優先使用 MUI component / theme / `sx`，不要建立大型手寫 CSS framework。
- 狀態管理使用 **Zustand + Immer**。
- runtime schema / content validation 使用 **Zod**。
- build 使用 **Vite**，測試使用 **Vitest**。
- 新 dependency 必須有明確用途；不要為一個很小的 helper 引入大型套件。

## 遊戲規則架構

- 不得用角色名稱或角色 ID 在 `GameEngine` 內建立角色特判，例如：

  ```ts
  if (character.id === 'pintbox') { ... }
  ```

- 一般角色技能應使用 declarative `SkillDefinition`，經由：

  `Game Event -> SkillRuntime -> Condition -> EffectRegistry -> Game State`

- 只有 vocabulary 無法表達的新 mechanic 才新增 Effect handler 或 custom handler。
- 卡牌效果與角色技能盡量共用同一套 effect vocabulary。
- 新增 effect kind 時必須同步更新 schema、runtime handler 與至少一個測試案例。
- 新增 target kind 時必須確認 `SkillActivationDialog` 是否能由 metadata 自動產生 UI。

詳細規則見 `ARCHITECTURE.md` 與 `SKILL_AUTHORING.md`。

## Content 與資料

- 角色、技能、卡牌、match preset 分別放在 `src/content/` 對應 module。
- `src/content/catalog.ts` 只負責聚合、索引與 reference validation；不要重新塞回所有資料。
- 未定案的聊天討論不可默認為正式規則；應標成 prototype assumption 或 TODO。
- 與原始 Discord 討論有關的判斷，優先參考 `discussion-notes.md`。

## 角色美術

- runtime 角色立繪使用 `public/assets/characters/*.webp`。
- 立繪固定 **3:4**，標準輸出為 **768 x 1024**，同一批角色必須統一 pixel dimensions。
- Runtime 角色圖必須直接生成為**獨立角色物件**；不得從 concept board、card mockup、拼圖或多人概念圖裁切。
- 不得用 blurred padding、letterbox、延伸背景等方式把錯誤比例偽裝成 3:4。
- 圖片本身不要包含角色名稱、能力值、技能文字、卡框、badge 或其他 UI text；這些由 React/MUI render。
- 臉部與主要輪廓需落在中央 safe area，避免 responsive UI 再次裁掉頭部。
- 詳細規格見 `CHARACTER_CARD_ART.md`。

## 編碼與 shell

- 所有文字檔使用 UTF-8。
- Windows / PowerShell 環境若需讀寫包含中文的文字，優先使用 `pwsh`，並明確指定 UTF-8。
- 不可根據 mojibake / 亂碼內容修改檔案。
- 在 PowerShell 產生多行原始文字時，優先使用 here-string，避免 agent 反覆處理 escape。

## 修改與驗證

完成修改前至少執行與改動相關的檢查：

```bash
npm run typecheck
npm run test
npm run build
```

若環境無法下載 dependency，必須明確記錄限制，不得把未執行的驗證寫成已通過。可使用 repo 內既有的 source-level / runtime smoke 方法補充驗證，但不能冒充正式 build。

## Git / GitHub

- GitHub repository `roleecorn/aa-card-game` 是此專案的 authoritative source。
- **只要對專案內容做了實際修改，就必須把對應修改提交到 GitHub；不可只修改暫存工作目錄或只提供 ZIP。**
- 若產生候選素材但尚未決定採用，可留在暫存區；一旦宣稱已替換 runtime asset，就必須同步提交該 asset。
- 不 commit `node_modules/`、`dist/`、coverage、IDE cache、環境 secret 或 release ZIP。
- commit 應聚焦單一目的，message 使用簡短 imperative / conventional style 皆可。
- 不 force-push、不重寫使用者既有歷史，除非使用者明確要求。
