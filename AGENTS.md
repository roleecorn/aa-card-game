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
- 每次新增／替換 portrait 後必須執行 `npm run art:normalize` 與 `npm run art:validate`。
- validator 必須檢查 WebP RIFF 宣告長度與實際 bytes 是否一致；檔案存在不代表 binary 完整。
- WebP 壓縮後檔案大小不要求相同；只要求 canonical dimensions / encoding / container 完整性。
- 詳細規格見 `CHARACTER_CARD_ART.md`。
- 目前所有 runtime portrait 都規範化為 768×1024；其中六張由 legacy-quality source 轉成 runtime derivative，格式統一不代表原始細節被提升。實際狀態見 `PROJECT_STATUS.md`。

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

- **凡涉及遊戲系統或能力機制的改動，都必須把教學關卡列為 regression check。** 包含但不限於角色技能、卡牌效果、effect / condition / target vocabulary、骰子產生與分配、作品進度、壓力／資源、回合 phase、抽牌／牌庫順序、AI 行動與相關互動 UI。
- 必須確認教學使用的固定 roster、固定抽牌順序、deterministic RNG、引導步驟、允許點擊範圍與 target dialog 仍能依既定順序完成；若改動刻意改變了教學所示範的能力或流程，應在同一修改中同步更新 tutorial content、step 定義與測試，不得留下過期教學。
- 與教學流程相關的 deterministic tests 應視為系統／能力改動的基本回歸測試；若改動影響實際互動或 selector / dialog anchor，還需要做 runtime UI 驗證，不能只看 unit test。

若環境無法下載 dependency，必須明確記錄限制，不得把未執行的驗證寫成已通過。可使用 repo 內既有的 source-level / runtime smoke 方法補充驗證，但不能冒充正式 build。

## Git / GitHub

- GitHub repository `roleecorn/aa-card-game` 是此專案的 authoritative source。
- **只要對專案內容做了實際修改，就必須把對應修改提交到 GitHub；不可只修改暫存工作目錄或只提供 ZIP。**
- 若產生候選素材但尚未決定採用，可留在暫存區；一旦宣稱已替換 runtime asset，就必須同步提交該 asset。
- 不 commit `node_modules/`、`dist/`、coverage、IDE cache、環境 secret 或 release ZIP。
- commit 應聚焦單一目的，message 使用簡短 imperative / conventional style 皆可。
- **角色內容採 atomic commit**：新增或完成一名角色時，其數值、角色/技能文本、實際 runtime 效果、測試與正式 portrait asset 必須在同一個 commit 內完成；不得先提交其中一部分再於後續 commit 補齊。
- **角色 package 一輪只處理一名角色。** 除非使用者明確要求同一輪處理多名角色，否則不得把多名新角色的 source analysis、圖片生成、runtime implementation 或測試混在同一 execution batch。
- **角色 package 必須使用真正的 Git working tree 作為 staging area。** `docs / code / tests / binary assets` 必須先共同存在於未提交的 working tree，通過本機驗證後再一次 commit。
- **不得使用 GitHub Contents API 的逐檔 `create/update/delete` commit 作為 character package 的主要組裝流程。** 該 API 每次寫檔都產生 commit，會破壞 documentation gate 與 single atomic commit；它只可用於非角色 package 的小型文字修改，或作為 scratch/candidate 階段，最終仍必須重建為單一乾淨 commit。
- 若執行環境只有 Git object API，允許先建立 candidate blobs/tree，最後以「`main`（或目標 base）為唯一 parent + 完整 candidate tree」建立一個乾淨 commit，再從該 commit 建立 branch；不要 force-push 或重寫既有 branch。
- Binary portrait / compact WebP 必須作為真正 Git blob 寫入同一 commit；不得以 base64 文字檔、外部暫存連結或「之後再補」替代。
- 不 force-push、不重寫使用者既有歷史，除非使用者明確要求。

## Figma

- 視覺排版與 component design 的 Figma file：`https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH`。
- GitHub/TypeScript 仍是 runtime logic 的 source of truth；Figma 是 visual/layout source。
- 若修改 layout、spacing、typography 或 component composition，應同步 Figma；若從 Figma 修改，必須經 design-to-code review 後再修改 TypeScript，不直接把 arbitrary Figma output 視為 production code。
- Figma 只處理概念、流程與 layout；**不要把 runtime raster asset 上傳／同步到 Figma 作為發布流程的一部分**。
- 圖片與文字/UI layer 必須分離。
- 工作流細節見 `FIGMA.md`。

## Repository-local skills

對應任務開始前讀取 `skills/` 下相關 `SKILL.md`：

- 新增／完成／修改角色：`skills/character-package/SKILL.md`
- 根據 Discord / Pintbox 討論判定規則：`skills/discussion-grounding/SKILL.md`
- 使用者要求「目前程式實際 UI」：`skills/runtime-ui-validation/SKILL.md`

這些 skill 不取代 `AGENTS.md`；若內容衝突，以 `AGENTS.md` 與更直接的使用者要求為準。
