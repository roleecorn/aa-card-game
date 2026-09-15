# Project Status

本文件記錄目前 `main` 的實作狀態與已知缺口。角色數值與能力的 authoritative source 是 `src/content/<character-id>.ts`；本文件只保存專案層級狀態，避免維護另一份容易漂移的完整角色資料表。

## Current snapshot

- 版本：`v0.4.0`。
- 對局長度：5 回合。
- 隊伍模式：**3 人 / 5 人可選**。
- 對戰入口：**Standard AI**、**Online human-vs-human**、Tutorial。
- 每名上場角色對應一部作品，因此每隊作品數為 3 或 5。
- Runtime catalog：**39 名角色**。
- Standard / Online 一般可出戰：**38 名角色**。
- 一般可出戰池只排除：`chaos`。
- 旁白 `narrator`、銀櫻 `ginsakura` 雖仍有 `planned` 技能，但保留在一般可出戰池，以支援實機、整合與回歸測試。
- 基礎牌庫：12 張；初始手牌 2；每回合抽 2；手牌上限 8。
- Tutorial：固定 roster、固定抽牌與 deterministic RNG。

`DEFAULT_MATCH.teamSize` 仍為 3，作為 Standard definition 的基準；3/5 人選擇會建立當局專用的 `GameDefinition`，不 mutation global catalog。

## Game modes

### Standard AI

- 從 Standard playable pool 隨機抽出雙方不重複 roster。
- 我方初始隊伍揭曉後，本局有一次重抽一名角色的機會。
- 我方確認隊伍後手動選組長；AI 初始組長為其 roster 第一名。
- 玩家完成 assignment 後由 Standard AI 自動執行對手回合。

### Online multiplayer

2026-09-14 已完成可玩的 serverless Online milestone：

- Host 建立房間前先選 3 人或 5 人模式。
- 使用 6 位數房間代碼配對。
- WebRTC DataChannel 傳遞 draft / command / snapshot；MQTT 只做短期 signaling。
- Host authoritative；Guest 傳 command，由 Host 執行規則並同步 snapshot。
- 雙方共用同一個 `BattleRoom`，Guest 端透過 perspective swap 讓本地玩家永遠顯示為 player side。
- Online 不走 Standard 的隨機抽隊／單次重抽；改用共同候選池的 snake-like draft。
- 3 人 draft：6 候選，`Host 1 → Guest 2 → Host 2 → Guest 1`。
- 5 人 draft：10 候選，`Host 1 → Guest 2 → Host 2 → Guest 2 → Host 2 → Guest 1`。
- 每一方第一個 pick 是該隊初始組長。
- 候選池使用 Standard playable pool，因此只排除 `chaos`；`narrator`、`ginsakura` 仍可成為候選。
- Picked character 會從中央候選池移除並動畫移入隊伍 rail；最終 pick 的動畫 settle 後才進入 BattleRoom。
- 左右隊伍 rail 保留捲動能力但不顯示 scrollbar。
- 關閉 Online setup dialog 會立即 disconnect / 取消目前配對流程，不留下背景連線。
- Online human turn 使用 `player-plan → player-assign → enemy-plan → enemy-assign`；Guest assignment 完成後才進下一回合。
- Online 不使用 Standard AI 的 enemy hand auto-discard；兩名真人都自行處理手牌上限。

開發細節與限制見 `ONLINE_MULTIPLAYER.md`。

## Shared BattleRoom

`src/app/BattleRoom.tsx` 已成為 Standard AI 與 Online gameplay 的共用戰鬥 UI。`App.tsx` 負責 start / Standard draw / Online draft / tutorial routing，不再各自維護兩套 battle layout。

這個邊界的目標是：

- Standard 與 Online 使用同一套角色、作品、手牌、技能、targeting UI。
- Online 只替換 turn authority / transport，不 fork 一份遊戲規則。
- UI / gameplay regression 優先在共用 BattleRoom 層驗證。

## Runtime roster status

目前 `src/content/catalog.ts` 聚合 39 個 per-character package。2026-09-13 的 PintBox balance batch 已加入 13 名角色：

- 天體齒輪、TA、Ingrid、橘天使、E、鈴嵐、二氧、Pray、阿道、滯澀、阿須、Enki、千鳥。

同批也更新了 Pintbox、風揚、流星、八代、格林、嘆息、鬼影、派大星、秋影、山田、嵐羽、神惱等既有角色。

### Planned characters

目前仍明確有 `planned` 技能：

- 旁白：`中國大阪人`、`超長發揮`。
- 銀櫻：`起來`、`愉悅的支援者`。

兩名角色**仍進入 Standard 自動抽選與 Online 一般候選池**。這是刻意的測試策略：角色必須能進入真實對局流程，才能持續做手動、整合與回歸測試。`planned` 只表示技能尚未有完整 runtime behavior，不代表角色不可出戰。

卡奧斯同樣保留在 catalog，但因 Boss / special content 尚未完成而排除一般 roster。

## Skill runtime audit / contract rebuild

2026-09-15 的全角色技能審查與 PR #68 不只修個別技能，也重建了測試與 runtime contract。

### Runtime corrections

- Pintbox `審稿` / `這只是基本的要求……` 缺失 handler 已補齊。
- 風揚 `起來` handler 已補齊。
- `cardPlayed` event 會帶實際 target/work/skill 等資料，情緒 `屬陀螺的` 可依真實 target 判定。
- `afterDiePlaced` 會帶 `slotIndex`，阿道 `開個回憶篇` 可正確判定第 4/5 slot。
- Enki `代組長力` 的 +2 現在真正參與 effective max Stress 計算。
- Enki `副組長力` 改為 pre-resolution `coordination.stressBearer` passive，不再靠出牌後搬 Stress，也不會受對手 card event 污染。
- 秋影 `拖延症` 同時處理一般 work batch 與額外取得骰。
- hidden / action-blocked 角色不能手動發動 Active skill。

### Declarative active-skill legality

Schema / SkillRuntime 現在支援：

- `activeCondition`：把作品類型、已有進度、作品篇幅、目標 Stress 等前置條件明確寫在 definition。
- `activeUsage.group`：多個技能共用一個 usage bucket，例如阿道加長／縮短全局合計 2 次。
- `memberStress`、`workLength`、`workHasProgress` 等 condition vocabulary。
- runtime-authoritative `canActivateSkillTarget()`；UI targeting 委派同一 validator，不再另寫角色特判。

已處理的 no-op / false-affordance 包括 Meteor、Grimm、Ghostshadow、Pigeon、Tanxi、Pray、TA、Triangle、Adao 等。

### Custom handler registry

- 所有 implemented custom effects 必須在 live registry 真正存在。
- custom handler 同名重複註冊會 fail fast，不再靜默覆寫。
- character-specific runtime handlers 集中在明確 bootstrap 路徑載入，而不是靠測試掃字串判斷。

## Test architecture

PR #68 後，技能測試不再只靠大型 mixed-roster suite：

- `src/tests/helpers/skillHarness.ts`：提供 neutral character fixtures，讓角色技能測試隔離其他角色的被動／trigger。
- `skill-contracts.test.ts`：驗證 implemented skill 有 executable behavior、custom handler live registration、duplicate handler fail-fast、planned-skill 角色仍保留在 Standard selection pool、shared usage group 等 contract。
- `skill-runtime-regressions.test.ts`：針對 Pintbox、風揚、情緒、阿道、Enki、秋影、hidden 等真實 runtime regression。
- `skill-targeting-contracts.test.ts`：驗證 UI availability / target candidates 與 runtime validator 一致。
- Cross-character interaction 需要獨立測試，避免再出現「測試通過其實是另一名角色技能代替生效」的 false positive。
- 依賴 event payload 的技能必須至少有一次透過真實 Engine emitter 的 integration regression，不能只人工 construct event。

PR #68 合併前的自動驗證基線：Tutorial 5/5、Vitest 46 files / 230 tests、39 portrait + 39 compact assets、TypeScript + Vite production build 全部通過。

## Gameplay state boundary

- Character Tag 只作為 metadata 或 selector / condition，不承載 gameplay effect。
- Standard roster eligibility 由 `content/match.ts` 管理。
- Gameplay restriction / immunity 由 Skill、Effect 或 runtime status 實作。
- Leader Stress 上限 +2 保存在當局 `CharacterState`。
- 所有卡牌 actor 固定由當前 `TeamState.leaderId` 推導。
- 副組長能力可改變 coordination Stress bearer，但不改變 card actor。
- 組長離場後由 Engine RNG 隨機選接任者；無人可接任立即判負。
- Active skill target legality 以 SkillRuntime 為單一 runtime source of truth。

## GameDefinition boundary

- `EngineSession`、`createInitialGame()`、`selectStandardRosters()` 與 leader bonus setup 使用完整 `GameDefinition`。
- Standard mode 使用 `STANDARD_GAME_DEFINITION`。
- Match constants、deck、team size 與 roster eligibility 由 definition 注入。
- UI 的 Standard/Online 一般選角必須遵守 `roster.excludedCharacterIds`。
- `createInitialGame(..., { playerMemberIds, enemyMemberIds })` 的 explicit roster override 是 deterministic test/custom scenario escape hatch，可以注入一般 roster 排除角色；不能拿這條路徑當作玩家 UI 的 eligibility 規則。

## Tutorial state boundary

- Tutorial progression 使用集中式 `TUTORIAL_SCENARIO` 與 semantic events。
- `TutorialRuntimeState` 保存可序列化的 `step` 與 deterministic RNG `randomIndex`。
- Tutorial RNG cursor 不使用 module-global mutable variable。
- Gameplay / ability 修改必須把 tutorial deterministic tests 視為 regression baseline。

## Character art status

Runtime character art：

```text
public/assets/characters/portrait/<character-id>.webp
public/assets/characters/compact/<character-id>.webp
```

正式規格：portrait 768×1024 WebP；compact 384×320 WebP。`art:normalize` 與 `art:validate` 負責正規化與 container / 尺寸完整性驗證。

## Known gaps

- 旁白兩個技能仍 planned，但角色保留在 Standard / Online 一般 roster 以便測試。
- 銀櫻兩個技能仍 planned，但角色保留在 Standard / Online 一般 roster 以便測試。
- Boss mode 尚未完成；卡奧斯排除 Standard / Online 一般 roster。
- **Standard AI 對 Active skill 的決策仍有限**：目前只會自動使用 `ai.autoUse` 且 `activeTarget.kind === 'none'` 的技能；需要選角色、作品或骰子的 Active skill 尚沒有通用 AI target chooser。
- Online 目前沒有 TURN relay；嚴格 NAT / 公司網路可能無法建立 P2P。
- Online 沒有可靠 reconnect / room persistence / public-matchmaking / anti-cheat server authority。
- 6 位數 room code 與 public MQTT signaling broker 適合朋友間 Prototype，不是安全憑證或正式 matchmaking infrastructure。
- Standard 的隨機抽隊、一次重抽與 3 / 5 人模式屬 Prototype decision，不代表 Discord 原始討論已定案。
- 部分早期角色資料仍包含 prototype assumption；需查看各角色 `sourceNotes`。

## Documentation sync policy

遊戲規則／遊戲數據不允許只改 code/data 而不改文件。影響玩家規則、角色／卡牌資料、match constants、roster eligibility、mode flow、target/effect semantics、online gameplay flow 的 PR，必須在**同一個 PR**同步更新相應文件。

Canonical mapping 與 agent 執行規則見 `AGENTS.md`。目前主要文件：

- `GAME_RULES.md`：runtime rules snapshot。
- `GAME_MANUAL.md`：玩家向規則與操作。
- `PROJECT_STATUS.md`：feature/roster/known gaps。
- `ONLINE_MULTIPLAYER.md`：Online flow / authority / limitations。
- `SKILL_AUTHORING.md`：skill schema / authoring / test contracts。
- `ARCHITECTURE.md`：runtime ownership / subsystem boundaries。
- `README.md`：頂層目前可玩能力與文件入口。

## Validation baseline

Gameplay / runtime 修改至少需要：

```bash
npm run typecheck
npm run test
npm run build
npm run test:tutorial
```

CI / release workflow 另外執行資產與 build 驗證。

**CI 綠燈不是 merge 授權。** 任何 PR 在 merge 前仍需人工 review / runtime testing；文件-only PR 至少需人工確認文件內容。AI agent 不自行 merge。