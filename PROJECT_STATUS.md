# Project Status

本文件記錄目前 `main` 的實作狀態與已知缺口。角色數值與能力的 authoritative source 是 `src/content/<character-id>.ts`；本文件只保存專案層級狀態，避免維護另一份容易漂移的完整角色資料表。

## Current snapshot

- 版本：`v0.4.0`。
- Standard 對局：5 回合。
- 隊伍模式：**3 人 / 5 人可選**。
- 每名上場角色對應一部作品，因此每隊作品數為 3 或 5。
- Runtime catalog：**39 名角色**。
- Standard 可出戰：**38 名角色**。
- Standard 排除：`chaos`；eligibility 由 `src/content/match.ts` 管理，不由 Character Tag 控制。
- 基礎牌庫：12 張；手牌上限 8。
- Tutorial：固定 roster、固定抽牌與 deterministic RNG 的教學流程已存在。

`DEFAULT_MATCH.teamSize` 仍為 3，作為 Standard definition 的基準；開始畫面選擇 5 人模式時會建立該局專用的 `GameDefinition`，不修改全域 catalog。

## Runtime roster status

目前 `src/content/catalog.ts` 聚合 39 個 per-character package。2026-09-13 的 PintBox balance batch 已加入：

- `tiantichilun` — 天體齒輪
- `ta` — TA
- `ingrid` — Ingrid
- `orangeangel` — 橘天使
- `e` — E
- `linlan` — 鈴嵐
- `eryang` — 二氧
- `pray` — Pray
- `adao` — 阿道
- `zhise` — 滯澀
- `axu` — 阿須
- `enki` — Enki
- `chidori` — 千鳥

同批也更新了多名既有角色的數值、適性與技能語義，包括 Pintbox、風揚、流星、八代、格林、嘆息、鬼影、派大星、秋影、山田、嵐羽、神惱等。不要再以舊版 `PROJECT_STATUS.md` 的 10 人表或舊版 `GAME_MANUAL.md` 的 26 人表判斷目前角色資料。

### 明確仍為 planned 的既有技能

目前可直接確認仍標示 `planned` 的能力：

- 旁白：`中國大阪人`、`超長發揮`。
- 銀櫻：`起來`、`愉悅的支援者`。

這些角色仍可進 Standard roster，但上述技能目前不產生完整 runtime behavior。

## Recent rule changes now implemented

### 3 / 5 player mode

- Start screen 會在「開始遊戲」後要求選擇 3 人或 5 人模式。
- `selectStandardRosters()`、`createInitialGame()` 與作品建立數量都依當局 `GameDefinition.rules.teamSize`。
- 5 人模式雙方各抽 5 名不同角色，並各建立 5 部作品。

### Pintbox

- `審稿` 已是 implemented active skill，不再只是舊文件中的 partial 行為。
- `這只是基本的要求……` 在 Pintbox Stress >= 3 時會自動處理低骰。
- `AI` 維持每回合第一次降低其他來源正外部 Stress 的行為。

### Shared hidden status

共用 hidden / 神隱 runtime 已建立，供 Ingrid、Pray、山田、滯澀等角色使用。Hidden 角色在期間內不可作為一般行動角色；作品不會因此自動刪除。

### Targeting / effect boundary

- 「可指定但 effect 無效」與「不可指定」已分開。
- 神惱屬於前者：仍可成為 target，但外部技能／卡牌對神惱本人的正負修改無效。
- 弱智屬於後者的一部分：不能成為直接角色目標的統籌卡 target；若擔任組長也不能使用統籌卡。
- UI / runtime 應只提供真正合法的 target；沒有任何合法 target 時，行動不應假裝可以正常發動。

## Character art status

Runtime character art 使用：

```text
public/assets/characters/portrait/<character-id>.webp
public/assets/characters/compact/<character-id>.webp
```

正式規格：

- portrait：768 × 1024 WebP，3:4。
- compact：384 × 320 WebP。
- sRGB、single-frame、完整 RIFF container。

`npm run art:normalize` 會以 canonical portrait 正規化資源並重建 compact；`npm run art:validate` 會檢查 portrait / compact 配對與 binary 完整性。

2026-09-09 曾發生 WebP blob 被截斷但檔名仍存在的問題，因此「路徑存在」不能代替 binary validation。

## Gameplay state boundary

- Character Tag 只作為 metadata 或 Skill selector / condition，不承載 gameplay effect。
- Standard roster eligibility 由 `content/match.ts` 管理。
- Gameplay restriction / immunity 由 Skill、Effect 或 runtime status 實作。
- Leader Stress 上限 +2 保存在當局 `CharacterState`。
- 所有卡牌 actor 固定由當前 `TeamState.leaderId` 推導。
- 組長離場後由 Engine RNG 從剩餘組員隨機選接任者；無人可接任則立即判負。
- 副組長類能力可以改變統籌卡 Stress bearer，但不會改變 card actor identity。

## GameDefinition boundary

- `EngineSession`、`createInitialGame()`、`selectStandardRosters()` 與 leader bonus setup 接受完整 `GameDefinition`。
- Standard mode 使用 `STANDARD_GAME_DEFINITION`。
- Match constants、deck、team size 與 roster eligibility 都由 definition 注入。
- 測試或其他 mode 若要替換 content，應建立新的 definition，不 mutation global catalog。

## Tutorial state boundary

- Tutorial progression 使用集中式 `TUTORIAL_SCENARIO` 與 semantic events。
- `TutorialRuntimeState` 保存可序列化的 `step` 與 deterministic RNG `randomIndex`。
- Tutorial RNG cursor 不使用 module-global mutable variable。
- Gameplay / ability 修改仍必須把 tutorial deterministic tests 視為 regression baseline。

## Known gaps

- 旁白兩個技能仍為 planned。
- 銀櫻兩個技能仍為 planned。
- Boss mode 尚未完成；卡奧斯目前仍排除於 Standard roster。
- Standard 的隨機抽隊與 3 / 5 人模式屬 Prototype decision，不代表 Discord 原始討論已定案。
- 部分早期角色的數值／適性仍包含 prototype assumption；需查看各角色 `sourceNotes`。
- `discussion-notes.md` 與舊 validation / balance note 可能保留歷史狀態，不能當成最新 runtime snapshot。

## UI / design

- Runtime UI：React + MUI。
- Layout design：Figma。
- Runtime component preview：Storybook。
- 真正 UI 驗證：Vite / deployed runtime；Figma screenshot 不等於 runtime test。

## Validation baseline

Gameplay / runtime 修改至少需要：

```bash
npm run typecheck
npm run test
npm run build
```

CI / release workflow 另外會生成當前 UI font subset，並依流程執行角色美術 normalize / validation 與 tutorial regression。

**CI 綠燈不是 merge 授權。** 依 `AGENTS.md` 與 `docs/release-flow.md`，任何 PR 在 merge 前都必須由人工實際 review / testing 並明確確認；AI agent 不自行 merge。
