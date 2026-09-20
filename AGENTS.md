# AGENTS.md

本檔案定義 AI coding agent 在此 repository 內工作的基本規範。若子目錄未來需要更特殊的規則，可在子目錄新增自己的 `AGENTS.md` 覆蓋較上層規則。

## 技術基線

- 使用 **TypeScript**。不要把主要遊戲邏輯改回 JavaScript。
- UI 使用 **React + MUI**；優先使用 MUI component / theme / `sx`，不要建立大型手寫 CSS framework。
- 狀態管理使用 **Zustand + Immer**。
- runtime schema / content validation 使用 **Zod**。
- build 使用 **Vite**，測試使用 **Vitest**。
- 新 dependency 必須有明確用途；不要為一個很小的 helper 引入大型套件。

## Reference-first implementation gate

- **新增任何程式、UI、content、test、文件結構或 asset 前，先找 repository 內職責最接近的既有檔案作 reference。** 新增項目應延續既有 naming、目錄、schema、component pattern、測試方式與視覺格式，不得在未確認 reference 的情況下自行建立第二套做法。
- 若真的沒有可對應的既有 reference，先把新的 convention / contract 寫入對應 canonical 文件並完成 review，再開始新增實作。
- 同一類 asset 已有固定格式時，不得因工具方便改用另一種格式。例如 individual card art 已由 `public/assets/cards/*.svg` 建立慣例，就不得自行改成 WebP / PNG。
- PR summary 應能指出重要新增項目的既有 reference；visual asset 應在 asset 或規格文件中保留可追溯 reference。

## 部署與 public asset 路徑

- **不得假設此 Web app 部署在 domain root。** GitHub Pages、preview、reverse proxy 或其他 hosting 都可能將程式掛在 `/aa-card-game/` 或其他子路徑。
- Repository 內 `public/` 資源的 canonical reference 必須使用 repository-relative path，例如 `assets/characters/portrait/example.webp`；**不得把 `/assets/...` 這類 root-absolute URL 當成正式寫法。**
- Browser runtime URL 必須經由 Vite `import.meta.env.BASE_URL` 或專案共用的 `resolvePublicAssetPath` 解析；不要在 component / content module 自行拼接網站根路徑。
- `https://...` 等真正外部資源 URL 可保持完整 URL；本 repository 自帶資源不適用此例外。
- 任何 public asset path 相關修改至少要有一個 non-root base regression，例如 `BASE_URL=/aa-card-game/`，確認輸出為 `/aa-card-game/assets/...` 而不是 `/assets/...`。

## 遊戲規則架構

- 不得用角色名稱或角色 ID 在 `GameEngine` / `EngineSession` 內建立角色特判，例如：

  ```ts
  if (character.id === 'pintbox') { ... }
  ```

- 一般角色技能應使用 declarative `SkillDefinition`，經由：

  `Game Event / Active request -> SkillRuntime -> Condition / Target / Usage -> EffectRegistry -> Game State`

- 只有 vocabulary 無法表達的新 mechanic 才新增 Effect handler 或 custom handler。
- 卡牌效果與角色技能盡量共用同一套 effect vocabulary。
- Active skill 的合法性必須優先由 `activeTarget` + `activeCondition` 表達，不要把發動前置條件藏在 custom handler。
- `SkillRuntime` 是 Active skill availability / target legality 的 runtime source of truth；UI candidate generation 必須委派同一 validator，不得另外建立角色／skill-ID 特判。
- 多技能共享使用次數時使用 `activeUsage.group`，不要在 custom handler 另外維護隱藏 counter。
- custom handler 必須透過正式 registry bootstrap 載入；同名 handler 不得重複註冊，所有 implemented custom reference 必須可由 live registry resolve。
- 新增 effect kind 時必須同步更新 schema、runtime handler 與至少一個測試案例。
- 新增 condition / target kind 時必須同步更新 schema、SkillRuntime、targeting/UI（如適用）與 consistency test。
- Skill 若依賴 event payload 欄位，必須確認真實 Engine emitter 有提供該欄位，並有至少一個透過 production action 觸發的 integration regression；只人工 construct event 不足以證明 contract。

詳細規則見 `ARCHITECTURE.md` 與 `SKILL_AUTHORING.md`。

## Content 與資料

- 角色、技能、卡牌、match preset 分別放在 `src/content/` 對應 module。
- `src/content/catalog.ts` 只負責聚合、索引、reference validation 與必要 runtime bootstrap；不要重新塞回所有資料或偷偷 migration 角色規則。
- Standard / Online 一般 roster eligibility 由 match configuration 管理，不由 Character Tag 控制。
- Explicit roster override 可作 deterministic test/custom scenario escape hatch，但不得解讀成玩家 UI 可以繞過 roster exclusion。
- 未定案的聊天討論不可默認為正式規則；應標成 prototype assumption 或 TODO。
- 與原始 Discord 討論有關的判斷，優先參考 `discussion-notes.md`。

## 遊戲規則／遊戲數據文件同步（Mandatory Documentation Sync Gate）

**任何涉及遊戲規則或遊戲數據的變更，都必須在同一個 PR 同步更新對應文件。** 這是 merge 前的必要條件，與測試是否通過無關。

### 哪些修改一定算「遊戲規則／遊戲數據」

包含但不限於：

- 角色 `stats / maxStress / affinities / tags / resources`；
- Skill 名稱、描述、activation、status、trigger、condition、target、usage、effect、passive；
- `implemented / partial / planned` 狀態改變；
- 卡牌 target、effect、種類、deck 張數／組成；
- 回合數、team size、抽牌數、手牌上限、作品篇幅、計分、缺項分數、Leader bonus；
- Standard / Online / Boss / Tutorial 等 mode 的 roster eligibility 或 setup 規則；
- Standard 抽隊／重抽／組長流程；
- Online 房間、選角順序、初始組長、turn flow、可見 gameplay lifecycle；
- Stress、Hidden、離場、適性、骰面、放置、作品進度、card actor / stress bearer 等規則；
- effect / condition / selector / activeTarget / status vocabulary 的語義；
- AI 行為若會改變實際對局中角色／卡牌如何被使用；
- 任何會改變「玩家能不能做某操作」或「操作結果」的 runtime 行為。

純視覺排版、純重構且**完全不改變上述行為／資料**時可以不更新遊戲規則文件，但 PR 必須能合理說明為何沒有規則／數據變更。不能以「改動很小」作為不更新文件的理由。

### 文件 mapping

變更發生時至少檢查以下文件，並更新所有實際受影響者：

- `GAME_RULES.md`：runtime 規則、系統語義、match / skill / card / scoring 行為。
- `GAME_MANUAL.md`：玩家實際看得到、需要理解的規則、數據、setup、操作流程。
- `PROJECT_STATUS.md`：角色數／可玩數、feature 完成度、planned scope、known gaps、重要 runtime 狀態。
- `README.md`：頂層可玩模式、角色／roster 數、主要已支援功能、文件入口。
- `ONLINE_MULTIPLAYER.md`：Online connection、selection、authority、turn flow、disconnect/reconnect、網路限制或任何 Online 玩家流程。
- `SKILL_AUTHORING.md`：Skill schema、condition/effect/target vocabulary、usage、event contract、handler/test authoring 規則。
- `ARCHITECTURE.md`：subsystem ownership、runtime pipeline、state boundary、Online authority、共用 UI / Engine 架構。
- `CHARACTER_AUTHORING.md`：角色 package 提交流程或角色資料 contract 發生變化時。
- `discussion-notes.md` / `docs/characters/*`：只有來源判定、正式設計決策或歷史紀錄本身改變時才更新；不要為了追平 runtime 而改寫歷史討論。

### 執行流程

1. **開始修改前**先判定這次規則／數據變更會影響哪些 canonical docs。
2. Code/data、tests、docs 在**同一個 PR**中保持一致；不要建立「先 merge code，之後再補手冊」的正常流程。
3. 若修改規則是修 bug，也要更新文件：文件描述的是目前正確行為，不是只記錄 feature request。
4. 若文件中已有過期資訊，這次變更碰到同一領域時應一起校正，不要只改一行留下已知矛盾。
5. PR summary 應列出同步更新了哪些規則文件；若判斷完全不需更新，應明確說明此修改不改變 gameplay rule/data 的理由。
6. **CI 綠燈不能取代文件同步。** Test 可以證明程式行為，不能證明玩家手冊與 project status 沒過期。
7. Review 時若發現 code/data 與文件不一致，視為未完成，不應 merge。

## Standard / Online 共用邊界

- `BattleRoom` 是 Standard AI 與 Online 的共用 active-match UI；不要為 Online fork 第二套 gameplay component tree。
- Online 應重用同一 `GameDefinition` / `EngineSession` / SkillRuntime / EffectRegistry，差異集中在 connection、selection、authority 與 human-turn handoff。
- 修改核心 Engine 時必須同時考慮 Standard、Online、Tutorial regression。
- 修改 Online 玩家流程時必須同步 `ONLINE_MULTIPLAYER.md`，若同時改變一般 gameplay rule，還要同步 `GAME_RULES.md` / `GAME_MANUAL.md` 等。

## 測試架構

- 單一角色技能測試優先使用 neutral / isolated fixture，避免 filler 角色的被動或 trigger 污染 assertion。
- 不能因為一個 mixed-roster 測試「綠」就認定被測技能真的生效；若另一角色能產生相同結果，必須拆分／隔離。
- Custom handler reference 要驗 live registry，不要只 grep / regex 掃 source。
- UI targeting 與 runtime target legality 必須有 consistency coverage。
- 多角色會互相作用的規則（副組長、Leader、Hidden、immunity 等）要有 cross-character interaction test。
- AI flow、Online human-turn flow、Tutorial flow 應分開 deterministic regression，避免新增角色／隨機 roster 讓測試漂移。

## 角色美術

- runtime 角色立繪使用 `public/assets/characters/portrait/*.webp`；compact 使用 `public/assets/characters/compact/*.webp`。Content reference 使用 `assets/characters/...`，由 runtime resolver 套用 deployment base。
- 每個可用角色都必須有可解析的 `portrait`；UI 需要 `compactPortrait` 時也必須有可解析資產。
- **角色提交不要求正式美術完成；placeholder / 代用圖即可滿足圖片完整性要求。** 正式 portrait 可後續由使用者手動替換。
- portrait 固定 3:4，標準輸出 768×1024；compact 384×320。
- 正式 Runtime 圖不得從 concept board、card mockup、拼圖或多人概念圖裁切。
- 不得用 blurred padding、letterbox、延伸背景偽裝錯誤比例。
- 圖片不要包含角色名稱、能力值、技能文字、卡框、badge 等 UI text；這些由 React/MUI render。
- 臉部與主要輪廓需落在中央 safe area。
- 使用者新增／替換正式 portrait 後應執行 `npm run art:normalize` 與 `npm run art:validate`。
- validator 必須檢查 WebP RIFF 宣告長度與實際 bytes；檔案存在不代表 binary 完整。
- WebP 檔案大小不要求相同，只要求 canonical dimensions / encoding / container 完整性。
- **Chat / AI agent 不得自行把圖片 binary 上傳、替換或提交到 GitHub / repository。** 不得用 base64、Git blob/tree API、Contents API、Actions decode、臨時 branch 等方式繞過。
- Chat / AI agent 可以產生、裁切、轉檔、驗證圖片並整理 ZIP，標示正確 repo path，由使用者手動上傳 binary。
- 詳細規格見 `CHARACTER_CARD_ART.md`。

## 卡牌美術

- Individual runtime card illustrations 使用 `public/assets/cards/*.svg`，canonical canvas 為 768×480（8:5）。
- 新卡圖必須先指定現有 SVG reference，沿用既有 `paper` / `crayon` texture、粗圓角 stroke、簡化幾何構圖與既有 palette family。
- 不得用 raster Image Generation 結果、WebP / PNG 或 `<image>` embedding 取代既有 individual-card SVG 畫風。
- `coordination.png` / `event.png` 是 category/UI asset，不是 individual card illustration 的格式 precedent。
- 詳細格式、reference mapping 與提交流程見 `CARD_ART_STYLE.md`。

## 編碼與 shell

- 所有文字檔使用 UTF-8。
- Windows / PowerShell 讀寫中文時優先使用 `pwsh` 並明確指定 UTF-8。
- 不可根據 mojibake / 亂碼內容修改檔案。
- PowerShell 產生多行原始文字時優先使用 here-string。

## 修改與驗證

完成修改前至少執行與改動相關的檢查：

```bash
npm run typecheck
npm run test
npm run build
```

- **凡涉及遊戲系統或能力機制的改動，都必須把教學關卡列為 regression check。** 包含角色技能、卡牌效果、effect / condition / target vocabulary、骰子、作品、Stress／resource、round phase、抽牌／牌庫、AI、Online 共用 Engine interaction 等。
- 建議直接執行 `npm run test:tutorial`；CI 中的 tutorial regression 也必須通過。
- 必須確認 tutorial 固定 roster、固定抽牌、deterministic RNG、guide steps、click restrictions 與 target dialog 仍能完成。
- 若改動刻意改變 tutorial 示範規則，應在同一修改中同步 tutorial content / steps / tests。
- 改動 selector/dialog/interaction 還需要 runtime UI 驗證，不能只看 unit test。
- Online gameplay / setup 改動需依 `ONLINE_MULTIPLAYER.md` 的 regression checklist 做人工雙端驗證。

若環境無法下載 dependency，必須明確記錄限制，不得把未執行的驗證寫成已通過。

## Git / GitHub

- GitHub repository `roleecorn/aa-card-game` 是此專案 authoritative source。
- 只要對**文字、程式碼、測試或設定**做了實際修改，就必須把對應修改提交到 GitHub；不可只修改暫存工作目錄。
- **任何 PR 在 merge 前都必須由人工完成實際測試／review並明確確認。** CI、unit/integration test、build、source-level check、automated browser check、AI/agent runtime check 都不能取代人工確認。
- **AI coding agent 不得把 CI 綠燈或自動測試通過視為 merge 授權。** 即使人工測試已通過，merge 仍是獨立操作，必須由使用者另外明確指示。
- 人工測試應針對修改實際影響的行為；純文件修改至少需要人工 review。詳見 `docs/release-flow.md`。
- **圖片 binary 是例外：Chat / AI agent 不負責上傳圖片到 GitHub。**
- 不 commit `node_modules/`、`dist/`、coverage、IDE cache、環境 secret 或 release ZIP。
- Commit 應聚焦單一目的。
- 新增或完成角色時，source/data/skill/runtime/tests/**docs** 應保持一致並可正常驗證；正式圖片不必與程式位於同一 atomic commit。
- 每個角色提交時仍必須有可解析圖片 reference；正式圖尚未提供時使用 placeholder / 代用圖。
- **角色 package 一輪只處理一名角色。** 除非使用者明確要求 multi-character batch。
- 不 force-push、不重寫使用者既有歷史，除非使用者明確要求。

## Figma

- 視覺排版與 component design 的 Figma file：`https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH`。
- GitHub/TypeScript 仍是 runtime logic source of truth；Figma 是 visual/layout source。
- 修改 layout、spacing、typography 或 component composition 時應同步 Figma；從 Figma 回寫需經 design-to-code review。
- Figma 只處理概念、流程與 layout；不要把 runtime raster asset 上傳／同步到 Figma 當發布流程。
- 圖片與文字/UI layer 必須分離。
- 詳見 `FIGMA.md`。

## Repository-local skills

對應任務開始前讀取 `skills/` 下相關 `SKILL.md`：

- 新增／完成／修改角色：`skills/character-package/SKILL.md`
- 根據 Discord / Pintbox 討論判定規則：`skills/discussion-grounding/SKILL.md`
- 使用者要求「目前程式實際 UI」：`skills/runtime-ui-validation/SKILL.md`

這些 skill 不取代 `AGENTS.md`；若內容衝突，以 `AGENTS.md` 與更直接的使用者要求為準。
