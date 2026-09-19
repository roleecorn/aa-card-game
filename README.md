# AA Group Card Game Prototype

基於 Discord 討論內容整理出的 TypeScript Web 卡牌遊戲 Prototype。規則主要以 Pintbox 的討論為基礎；尚未定案的部分以 prototype assumption 處理。

目前版本：**v0.4.0**

## 目前可玩的內容

- 一般對局固定 5 回合。
- 可選 **3 人模式**或 **5 人模式**；每名角色對應一部作品。
- 支援 **Standard AI** 與 **Online 兩人連線對戰**。
- Runtime catalog 共 **39 名角色**；一般 Standard / Online 可出戰 **38 名**，目前只排除特殊內容角色卡奧斯。旁白、銀櫻雖仍有 `planned` 技能，但照常保留在可選池以支援實機與整合測試。
- Standard AI：隨機抽隊、我方全局一次重抽、手動選組長、對手 AI 回合。
- Online：Host 先選 3/5 人模式，使用 6 位數房間代碼配對，再從共同候選池輪流選角；選角每個 batch 15 秒，Battle 每個 Plan / Assign phase 90 秒，逾時由 Host authoritative resolution 自動推進。
- 支援角色主動／被動／觸發技能、統籌卡與事件卡、Stress、作品適性、作品進度、組長接任、hidden／神隱等 runtime mechanic。
- Active skill 的可用性與 target legality 由 SkillRuntime 統一判定，UI 不應提供 runtime 會拒絕的假目標。
- 另有固定 roster / 固定抽牌 / deterministic RNG 的教學關卡。

目前程式實際規則以 [`GAME_RULES.md`](./GAME_RULES.md) 為準；玩家向完整說明見 [`GAME_MANUAL.md`](./GAME_MANUAL.md)；連線架構與限制見 [`ONLINE_MULTIPLAYER.md`](./ONLINE_MULTIPLAYER.md)。

## 技術棧

- TypeScript
- React
- Vite
- MUI
- Zustand + Immer
- Zod
- Vitest
- Storybook
- nanoid

設計原則是盡量使用既有 TypeScript ecosystem，不自行建立大型 UI framework、state framework 或 CSS system。

## 執行

需求：Node.js `^20.19.0 || >=22.12.0`

```bash
npm install
npm run dev
```

常用指令：

```bash
npm run typecheck
npm run test
npm run build
npm run verify
npm run test:tutorial
npm run art:normalize
npm run art:validate
npm run image:inspect -- <file>
npm run image:check -- <file> --width 768 --height 1024 --format webp --single-page --srgb
npm run image:webp -- <input> <output> --width 768 --height 1024 --fit cover
npm run test:image-tools
npm run storybook
```

## 對局模式

### Standard AI

1. 選擇 3 人或 5 人模式。
2. 系統從 38 名一般可出戰角色中抽出雙方不重複隊伍。
3. 我方初始隊伍有一次重抽一名角色的機會。
4. 我方確認隊伍後選組長。
5. 玩家完成回合後由 AI 自動處理對手回合。

### Online

1. Host 選 3 人或 5 人模式後建立 6 位數房間代碼。
2. Guest 輸入代碼加入。
3. 連線成功後，3 人模式從 6 名候選、5 人模式從 10 名候選輪流選角。
4. 選擇批次分別為 `1-2-2-1` 與 `1-2-2-2-2-1`；每個 batch 共用 15 秒，逾時由 Host 自動補完該批剩餘選擇。
5. 雙方第一個選到的角色就是初始組長。
6. 選角完成後共用同一個 `BattleRoom` 進行真人對真人回合。
7. 每個 Plan / Assign phase 各有新的 90 秒倒數；同一 phase 的出牌、技能、Work / Slack 或放骰不會重設時間。
8. Plan 逾時會提交目前選擇；Assign 逾時會正常結束配置並清掉未用骰。若手牌仍超過上限，先隨機棄掉超出張數。

Online 使用 WebRTC DataChannel，MQTT 僅做短期 signaling；rope deadline 與 timeout resolution 由 Host authoritative。倒數最後 10 秒會進入 warning。Timer 使用 absolute deadline，因此背景分頁不會取得額外規則時間。目前沒有 TURN relay 或可靠 reconnect。詳細見 [`ONLINE_MULTIPLAYER.md`](./ONLINE_MULTIPLAYER.md)。

## 部署與資源路徑

這個 Web app **不假設部署在網站根目錄 `/`**。正式 release 目前由 GitHub Pages 掛在 repository 子路徑，因此 Vite build 會使用類似 `/aa-card-game/` 的 `base`。

Repository 自帶的 `public/` 資源使用 repository-relative reference，例如：

```text
assets/characters/portrait/example.webp
assets/characters/compact/example.webp
assets/cards/guide.svg
```

不要在 content 或 component 中把 `/assets/...` 當成正式路徑。Browser runtime URL 應經由 Vite `import.meta.env.BASE_URL` 或專案共用 `resolvePublicAssetPath` 解析。

涉及 public asset path 的修改應包含 non-root base regression test。

## Branch / release policy

- `main` 是 application source、規則、文件與 deployment workflow 的 source of truth。
- `release` 代表目前部署中的版本，不應直接維護只存在於 `release` 的 source code、workflow 或 UI 差異。
- 一般 `main` 更新只跑 CI；發布時建立 `main -> release` PR。
- 任何 PR merge 前都必須完成人工測試／review；CI 綠燈不等於 merge 授權。
- 完整流程見 [`docs/release-flow.md`](./docs/release-flow.md)。

## 圖片工具與角色美術

Runtime 角色圖片：

```text
public/assets/characters/portrait/<character-id>.webp
public/assets/characters/compact/<character-id>.webp
```

正式 portrait 規格為 3:4、768×1024 WebP；compact slot 為 384×320 WebP。名稱、數值、技能文字與卡框由 React/MUI render，不烘焙到 raster art。

Repository 內建圖片工具：

- `npm run image:inspect -- <file> [file...]`
- `npm run image:check -- <file> ...`
- `npm run image:webp -- <input> <output> ...`
- `npm run art:normalize`
- `npm run art:validate`

角色圖完整規格見 [`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)。

## 規則與內容架構

角色技能不應散落成 `GameEngine` 裡的角色特判。主要流程：

```text
Game Event / Active request
  -> SkillRuntime
  -> Conditions / target legality / usage
  -> EffectRegistry / customEffects
  -> Game State
```

角色採 per-character package：

```text
src/content/<character-id>.ts
```

`src/content/catalog.ts` 負責聚合、索引與 reference validation；Standard roster / deck / match constants 由 `src/content/match.ts` 管理。Standard AI 與 Online 共用 `BattleRoom` 與核心 Engine；Online 只另外處理 connection、draft、command / timer authority 與 human turn ownership。

詳細內容：

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`SKILL_AUTHORING.md`](./SKILL_AUTHORING.md)
- [`CHARACTER_AUTHORING.md`](./CHARACTER_AUTHORING.md)
- [`ONLINE_MULTIPLAYER.md`](./ONLINE_MULTIPLAYER.md)

## Documentation policy

涉及**遊戲規則或遊戲數據**的修改，必須在同一個 PR 同步更新對應文件；不能只改 code/data 後依賴 CI。Canonical 規則與文件對應表定義在 [`AGENTS.md`](./AGENTS.md)。

## Repository 文件

- AI / coding agent：[`AGENTS.md`](./AGENTS.md)
- Contribution：[`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Runtime 規則：[`GAME_RULES.md`](./GAME_RULES.md)
- 玩家向遊戲說明：[`GAME_MANUAL.md`](./GAME_MANUAL.md)
- Online：[`ONLINE_MULTIPLAYER.md`](./ONLINE_MULTIPLAYER.md)
- 實作狀態 / Known gaps：[`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
- 架構：[`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Skill authoring：[`SKILL_AUTHORING.md`](./SKILL_AUTHORING.md)
- Character authoring：[`CHARACTER_AUTHORING.md`](./CHARACTER_AUTHORING.md)
- 角色美術：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)
- 歷史驗證紀錄：[`VALIDATION.md`](./VALIDATION.md)
- 討論整理：[`discussion-notes.md`](./discussion-notes.md)
- Figma / Storybook workflow：[`FIGMA.md`](./FIGMA.md)
- Release workflow：[`docs/release-flow.md`](./docs/release-flow.md)
- Repository-local agent skills：[`skills/README.md`](./skills/README.md)

## 目錄

```text
aa-card-game/
├─ public/assets/
├─ src/
│  ├─ app/                # App routing + shared BattleRoom
│  ├─ components/
│  ├─ content/            # character/card/match/catalog
│  ├─ game/               # engine / skill runtime / online turn
│  ├─ online/             # signaling / session / draft / rope / protocol
│  ├─ store/
│  ├─ tutorial/
│  └─ tests/
├─ docs/
├─ AGENTS.md
├─ GAME_RULES.md
├─ GAME_MANUAL.md
├─ ONLINE_MULTIPLAYER.md
├─ PROJECT_STATUS.md
└─ README.md
```

## Prototype rule summary

- 5 回合；3 人或 5 人小隊。
- Standard AI 或兩人 Online。
- Online 選角每 batch 15 秒；Battle 每個 Plan / Assign phase 90 秒；倒數由 Host authoritative。
- 每名角色各有一部作品。
- Progress 依 `Design → Text → AA`。
- 高骰可以覆蓋同類型低骰。
- Work 通常增加 Stress；Slack 降低 Stress。
- 作品類型為 `燃 / 謀 / 笑 / 情 / 色 / 怪`。
- 角色技能與卡牌效果共用 data-driven effect pipeline。
- Standard / Online 一般 roster eligibility 由 match configuration 管理，不由 Character Tag 決定。
- `planned` skill status 不會自動把角色排除出一般 roster；目前旁白與銀櫻仍可被 Standard 抽到，也可出現在 Online 候選池。

這仍是 Prototype，不代表 Discord 討論中的所有規則都已定案或實作。