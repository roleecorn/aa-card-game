# Architecture

這個 Prototype 把 UI、狀態、內容資料、規則執行與 Online transport 拆開。核心目標：新增／修改角色技能時正常情況不修改 `EngineSession`，Standard AI 與 Online 也不各自維護一份 gameplay rules。

## External modules

- **React + Vite + TypeScript**：應用程式與 build。
- **MUI**：UI components / theme。
- **Zustand + Immer**：React game state 與 immutable update integration。
- **Zod**：character / skill / card / effect runtime schema validation。
- **nanoid**：card / die / work / log ID。
- **Vitest**：規則與 UI/source-level regression tests。
- Browser WebRTC API：Online DataChannel。

Domain-specific Skill / Effect vocabulary 仍由 TypeScript 實作，因為它直接代表遊戲規則。

## Source layout

```text
src/
  app/
    App.tsx                    start / Standard draw / Online draft / tutorial routing
    BattleRoom.tsx             shared active-match UI for Standard + Online
    theme.ts
  components/                  reusable React/MUI UI
  content/
    catalog.ts                 aggregate + reference validation + handler bootstrap boundary
    <character-id>.ts          CharacterDefinition + character-specific Skills
    viceLeaderSkill.ts         shared cross-character Skill
    cards.ts                   Card definitions
    match.ts                   Standard rules / deck / roster eligibility
  game/
    contentRegistry.ts         static GameContent interface
    gameDefinition.ts          GameDefinition / MatchRules boundary
    schema.ts                  Zod schemas + domain types
    statuses.ts                named runtime status keys/helpers
    engine.ts                  turn flow and core invariants
    onlineTurn.ts              human-vs-human phase handoff using shared Engine rules
    skillRuntime.ts            trigger / condition / usage / active legality dispatcher
    effectRegistry.ts          reusable built-in effects
    customEffects.ts           custom handler registry + generic special mechanics
    characterSkillEffects.ts   registered character-specific custom handlers
    cardHandlers.ts            card-only custom handlers
    targeting.ts               player-facing legality/candidate explanations; delegates to runtime
  online/
    onlineSession.ts           peer/session lifecycle + Host authority + timer resolution
    onlineDraft.ts             deterministic selection state / batch order
    onlineRope.ts              Online deadline / remaining-time / timeout helpers
    mqttSignaling.ts           short-lived MQTT signaling client
    protocol.ts                command / snapshot / timer / perspective protocol
  tutorial/
    config.ts
    scenario.ts
    runtime.ts
    TutorialGuide.tsx
  store/gameStore.ts
  tests/
public/assets/
```

## Ownership boundaries

### Content

每個 `src/content/<character-id>.ts` 同時保存該角色的 `CharacterDefinition` 與角色專屬 `SkillDefinition`。Stats、affinities、tags、source notes、skill IDs 與 skill definitions 因此有單一 ownership boundary。

只有真正跨角色共用的內容才放 shared module。

`catalog.ts` 只負責：

- import 各角色 package / shared content；
- 聚合 `CHARACTERS / SKILLS / CARDS`；
- resolve runtime asset path；
- duplicate ID、missing reference、forbidden behavior-tag 等 validation；
- 載入正式 custom-handler bootstrap，使 live registry 在 runtime 已完成註冊。

`catalog.ts` 不應重新定義角色規則或偷偷 migration skill behavior。

### Match configuration

`src/content/match.ts` 擁有：

- Standard deck；
- round/team size defaults；
- hand / work / scoring constants；
- Standard roster eligibility。

目前 Standard / Online 一般 roster 只排除 `chaos`。`planned` skill status 不構成 roster exclusion；旁白 `narrator` 與銀櫻 `ginsakura` 保留在一般 selection pool，讓角色可進入真實對局做實機／整合測試。Eligibility 不放 Character Tag。

### Battle UI

`BattleRoom.tsx` 是 Standard AI 與 Online 的**共用 active-match UI**。不要因 Online 加功能而 fork 第二份角色卡、作品 board、技能 dialog、card hand 或 targeting flow。

`App.tsx` 只決定如何進入 BattleRoom：

- Standard：mode → random roster → one reroll → leader selection。
- Online：connection → synchronized character selection → formal game creation。
- Tutorial：固定 scenario。

Online 額外使用 phase 作為 interaction lifecycle boundary：authoritative phase 改變時，以 phase key 重新建立 BattleRoom 內的暫存互動 state，確保未確認的 card / skill / target / selected-die 不跨 phase 殘留。這個 remount 行為只套用 Online，不改變 Standard / Tutorial lifecycle。

## Core runtime flow

Triggered / passive/event-driven：

```text
Game action
   ↓
EngineSession emits SkillEvent
   ↓
SkillRuntime
   ├─ resolve subscriptions
   ├─ evaluate conditions
   ├─ enforce usage
   └─ dispatch effects
          ↓
 EffectRegistry / custom registry
          ↓
       GameState
```

Active skill：

```text
UI asks availability / candidates
   ↓
SkillRuntime.canUseActive / canActivateSkillTarget
   ├─ action-blocked / status guard
   ├─ usage limit
   ├─ activeTarget structure + relation + die filters
   └─ activeCondition
        ↓
UI shows only runtime-legal choices
        ↓
activate()
        ↓
EffectRegistry / custom registry
```

角色 ID 不應出現在 `EngineSession` / `SkillRuntime` 的條件分支。

## Active target legality is runtime-authoritative

#68 後，`SkillRuntime` 是 Active skill legality 的單一 runtime source of truth。

- `activeTarget`：描述 target shape / relation / skill / minValue / maxValue / tag 等。
- `activeCondition`：描述 owner/selected target 的前置條件，例如 work type、Stress、work length、existing progress。
- `targeting.ts` 可產生人類可讀 blocked reason，但 candidate 是否 allowed 最終委派 `engine.skills.canActivateSkillTarget()`。
- `SkillActivationDialog` 不應另寫 character ID / skill ID 特判。

Invariant：

> 任何 UI 標示 allowed 的 Active target，都必須由同一 runtime validator 接受。

這個設計防止「玩家看得到／選得到，但按下去 runtime 才拒絕」的 false affordance。

## Usage model

Usage rule 可用：

- `scope: round | game`
- `limit`
- optional `key`
- optional `group`

`group` 讓多個 Skill 共用 counter，例如阿道加長／縮短。共享 quota 不應再藏在 custom handler 自己操作 `skillUsage`。

## Event payload contract

`SkillEvent` 不只是鬆散通知；只要 Skill condition/handler 依賴欄位，emitter 就必須真實提供。

例如：

- `afterDiePlaced.metadata.slotIndex`：阿道第 4/5 slot 規則。
- `cardPlayed.targetId`：情緒判斷自己是否真的是統籌卡 target。
- `cardPlayed.workId / skill / sourceKind / metadata.cardId`：card interaction context。

因此 event-dependent tests 至少要有一個透過 production Engine action 觸發 emitter 的 integration case；人工 construct 一個較完整 event 不能證明 production contract 正確。

## Condition coverage

目前 condition vocabulary 包含：

- Boolean：`all / any / not`
- Relation：self / ally / other ally / enemy
- `ownerStress`
- `memberStress`
- owner effective stat
- round
- event amount / skill / source kind / metadata
- dice batch matching
- pending dice matching
- owner status
- work type
- work score
- `workLength`
- `workHasProgress`
- probability / chance

若新技能只缺一個可重用 condition，優先擴充 vocabulary，而不是寫 custom handler 隱藏前置條件。

## Selector coverage

### Member selectors

- `owner`
- `eventActor / eventTarget / eventSource`
- `selectedMember / selectedWorkOwner`
- `teamLeader`
- `allAllies / otherAllies / allEnemies`
- `randomAlly / randomOtherAlly / randomEnemy`
- `highestStressAlly / lowestStressAlly`
- `highestStressEnemy / lowestStressEnemy`

### Work selectors

- `ownerWork / eventWork / selectedWork`
- `allAllyWorks / allEnemyWorks`
- `randomAllyWork / randomEnemyWork`
- `lowestScoreAllyWork / highestScoreAllyWork`
- `lowestScoreEnemyWork / highestScoreEnemyWork`

## Effect coverage

### Stress / Event

- `stress.change`
- `stress.set`
- `event.amount`
- `event.cancel`

### Dice

- `dice.grant`
- `dice.grantBestOf`
- `dice.rerollBatch`
- `dice.modifyPending`
- `dice.modifySelected`
- `dice.copySelectedValue`
- `dice.removeSelected`
- `dice.removePending`
- `dice.convertPending`

### Stats / Work / Progress

- `stat.change`
- `work.length`
- `work.type`
- `work.progress.add`
- `work.progress.fill`
- `work.progress.rerollLowest`
- `work.progress.clear`

### Cards / Status / Utility

- `cards.add`
- `cards.draw`
- `cards.discardRandom`
- `status.change`
- `log`
- `custom`

## Custom effect registry

只有 generic vocabulary 無法表達 mechanic 時才使用 `custom`。

Registry contract：

- `registerCustomSkillEffect(name, handler)` 遇到重複 name 直接 throw；禁止 silent overwrite。
- `hasCustomSkillEffect(name)` 可讓 contract tests 查詢**實際 live registry**。
- 所有 non-planned Skill 引用的 custom handler 都必須已由 runtime bootstrap 載入。
- Character-specific handlers 放在明確的 `characterSkillEffects.ts` 等 runtime module，不把 implementation 塞回 catalog data。

測試不得只 regex 掃 repository 原始碼證明 handler 名稱存在；那無法證明 module 真正被 runtime import。

## Coordination stress bearer

統籌卡 actor 固定是當前組長。副組長能力只改變共通 +1 Stress 的 bearer。

`coordination.stressBearer` passive 在 card stress resolution **之前**決定承擔者：

- `allowEqual: false`：candidate stress < leader stress。
- `allowEqual: true`：candidate stress <= leader stress。
- hidden candidate 不可承擔。
- 多名 candidate 時 runtime 選一名，不能每個 passive 各自搬一次 Stress。

這避免過去「cardPlayed 後再把組長 Stress 搬走」造成 event ordering / cross-team interaction bug。

## Tag boundary

`CharacterDefinition.tags` 只描述「角色是什麼」，不描述「角色會做什麼」。

Tag 可以：

- UI 顯示分類；
- target selector / condition 尋找合法對象。

Tag 不得直接：

- 改 Stress / dice / stat / work；
- 禁止行動；
- 提供 immunity；
- 修改 card permission；
- 控制 Standard / Online roster eligibility。

Gameplay restriction / immunity / permission 必須由 Skill、Effect 或 runtime status 實作；mode eligibility 由 match configuration 實作。

## Immutable content and match state

`CharacterDefinition / SkillDefinition / CardDefinition` 是靜態內容。當局效果寫入 `CharacterState / TeamState / WorkState`，不得 mutation definition。

例如：

- 組長 +2 Stress cap 使用 status。
- Enki `actingLeaderStressCapBonus` 也是 state status，並由 `getEffectiveMaxStress()` 統一計算。

## GameContent and GameDefinition

`GameContent` 只描述 static registries；`GameDefinition` 描述一局如何建立：

```ts
interface GameDefinition {
  id: string;
  content: GameContent;
  rules: MatchRules;
  deck: readonly string[];
  roster: { excludedCharacterIds: readonly string[] };
}
```

Standard mode 使用 `STANDARD_GAME_DEFINITION`。

`EngineSession`、`createInitialGame()`、`selectStandardRosters()` 等接受完整 definition。測試或其他 mode 若替換 content，應建立新 definition，不 mutation global catalog。

### Explicit roster override

`createInitialGame(..., { playerMemberIds, enemyMemberIds })` 是 deterministic scenario / test escape hatch：只驗證角色存在、team size、無重複，不套用 user-facing Standard eligibility。

因此：

- UI / normal Standard selection 仍必須遵守 `roster.excludedCharacterIds`。
- Online candidate pool 也必須遵守同一 exclusions。
- `planned` skill status 不會自動加入 exclusions；目前旁白、銀櫻必須存在於 normal Standard selection source 與 Online candidate source，才能覆蓋真實遊戲流程測試。
- 測試仍可以明確注入真正 excluded 的角色（例如 `chaos`）驗證 special behavior，但不能拿 override API 當作玩家 eligibility 規則。

## Online architecture

Online transport 與玩法規則分層：

```text
OnlineConnectionDialog
   ↓
MQTT signaling (temporary)
   ↓
WebRTC DataChannel
   ↓
Online session / protocol
   ├─ Host-authoritative rope deadline
   └─ command / draft / timer synchronization
   ↓
Host-authoritative EngineSession
   ↓
shared BattleRoom
```

### Host authority

- Host 持有 authoritative state / RNG / EngineSession。
- Host 也持有 authoritative Online `deadlineAt` 與 timeout callback；timer 不放進 core `GameState`。
- Guest 送 command，不自行結算，也不能自行宣告 timeout。
- Host 在處理 Guest command 前先檢查 deadline；若已過期，先做 timeout resolution。
- Host 驗證／timeout resolution 完成後 broadcast snapshot。
- Guest perspective swap 讓共用 BattleRoom 的 `player` 永遠代表本地使用者。
- Snapshot / draft sync 會帶 `timer` 與 `hostNow`；Guest 用 Host 當下的剩餘時間換算本機顯示 deadline，避免直接假設兩台機器 wall clock 相同。

### Online rope state

`onlineRope.ts` 保存不依賴 React 的 timer helper：

- draft batch：15 秒。
- battle phase：90 秒。
- warning threshold：最後 10 秒。
- draft timer ID：`draft:<batchIndex>`。
- battle timer ID：`battle:<round>:<phase>`。
- `deadlineAt` 是 authority；畫面每 100ms 重算剩餘顯示，但不以 UI interval 累積規則時間。

`onlineSession.ts` 保存 session-level mutable authority：

- `timer` / timeout notice。
- Host timeout handle。
- Guest Plan `remotePlanChoices` preview。
- initial draft reveal readiness。

Timeout 行為仍呼叫正式 store / Engine API，不另外 fork gameplay implementation：Plan 走 `performOnlineActions()`，Assign 走 `finishOnlineAssignment()`，超量手牌走 `discardCards()`。

### Online character selection

- `onlineDraft.ts` 保存 serializable selection state。
- 3 人 batch `[1,2,2,1]`；5 人 `[1,2,2,2,2,1]`。
- pool size 固定 `teamSize * 2`。
- candidate source 使用 Standard roster eligibility；目前只排除 `chaos`，`narrator` 與 `ginsakura` 保留可選。
- Initial reveal ready 是 timer start gate；後續 pick transfer animation 不控制 timer authority。
- 每個 batch 共用一條 timer，batch 內的第一個 pick 不會 reset。
- Timeout auto-completion 只補完目前 batch，之後正常切換下一個 batch / side。
- Host 建立正式 GameState 前必須 selection complete 且本地動畫 settled。
- Guest 收到 gameplay snapshot 也要等自己的 final transfer animation settled 才離開 selection screen。

### Online turn adapter

`onlineTurn.ts` 重用 Engine private round pipeline，但把 Standard 的 AI handoff 改成人類雙方 phase：

`player-plan → player-assign → enemy-plan → enemy-assign → advanceRound`

Online transition 暫時替換 draw/add-card 的 enemy auto-discard 行為，避免把真人 Guest 當 AI 自動棄牌。正常情況由真人自己處理 hand limit；如果 timer deadline 到達且該 side 仍超量，Online session 才用正式 `discardCards()` 隨機棄掉 excess，讓 timeout transition 可繼續。

Guest 的 Plan UI state 不進 core GameState；`planPreview` 只把目前 Work / Slack choice 傳給 Host session，讓 Host Plan timeout 能提交 Guest 當下選擇。Host 自己的 choice 直接讀 authoritative local game store。

更完整內容見 `ONLINE_MULTIPLAYER.md`。

## Tutorial state boundary

Tutorial 使用集中式 scenario + serializable runtime state：

```text
UI interaction
   ↓
TutorialEvent
   ↓
reduceTutorialEvent(runtime, event)
   ↓
TutorialRuntimeState { step, randomIndex }
```

Gameplay / ability / target / turn flow 修改必須跑 tutorial regression。

## Test architecture

技能與規則測試分層：

1. **Contract tests**：schema / handler registry / roster eligibility / shared usage invariant；planned-skill characters 的 selection-pool inclusion 也要有回歸保護。
2. **Isolated skill tests**：`helpers/skillHarness.ts` 的 neutral fixtures，避免 filler 角色技能污染 assertion。
3. **Runtime integration regressions**：透過真實 Engine action 驗 event payload / ordering。
4. **Targeting consistency**：UI candidate allowed 必須等於 runtime validator。
5. **Cross-character interaction**：副組長、immunity、hidden、leader 等會互相影響的規則獨立測。
6. **Tutorial regression**：任何 gameplay 系統修改的 baseline。
7. **Online regressions**：draft order、perspective、human turn handoff、setup lifecycle、rope duration / deadline / batch timeout helper。

不要用「某個 assertion 綠」取代行為隔離；如果 fixture 有其他角色技能能產生同一結果，測試就不可信。

## AI boundary

Standard AI 目前不是完整通用 skill planner：

- 只自動使用 `ai.autoUse` 的 Active skill。
- 且目前只支援 `activeTarget.kind === 'none'`。
- 需要指定 member/work/die 的 Active skill 不會自動使用，除非未來新增通用 AI target policy。

這是目前已知能力邊界，不能因 runtime 能由真人合法發動就宣稱 AI 也會使用。

## Art assets

Runtime art 使用：

- `public/assets/characters/portrait/*.webp`
- `public/assets/characters/compact/*.webp`
- `public/assets/cards/*`

角色卡文字／遊戲資料由 React/MUI render，不烘焙進圖片。詳細見 `CHARACTER_CARD_ART.md`。

## Documentation boundary

遊戲規則或遊戲數據變更也是 architecture contract 的一部分：同一 PR 必須更新對應 runtime/player/status/online/authoring 文件。完整 mandatory mapping 見 `AGENTS.md`。

架構文件描述 ownership 與 invariant；角色具體數值仍以 `src/content/` 為 authoritative source，現況與 known gaps 見 `PROJECT_STATUS.md`。

## 2026-09-19 work-type and roll-constraint boundary

`WorkState` keeps a primary `type` plus `extraTypes`. Rule code must use `EngineSession.getWorkTypes/workHasType` instead of directly assuming a single type when checking affinity or conditions.

Roll legality is centralized in `EngineSession.rollDieFor`, combining roll-floor passives, permanent forbidden-face passives, and round-scoped roll constraints. A roll may resolve to no die when all faces are forbidden; callers must preserve that disappearance semantic.

Coordination payment legality is resolved before card effects and uses `SkillRuntime.getCoordinationStressBearer`.
