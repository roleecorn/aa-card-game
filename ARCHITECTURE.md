# Architecture

這個 Prototype 把 UI、狀態、內容資料與規則執行拆開，目標是新增角色或技能時，正常情況不修改 `GameEngine`。

## External modules

- **React + Vite + TypeScript**：應用程式與 build。
- **MUI**：UI components 與 theme；避免維護大型手寫 CSS。
- **Zustand + Immer**：React game state 與 immutable update integration。
- **Zod**：角色、技能、卡牌與 effect definition 的 runtime schema validation。
- **nanoid**：card / die / work / log ID。
- **Vitest**：規則測試。

Domain-specific 的 Skill / Effect vocabulary 仍由 TypeScript 實作，因為這部分直接代表遊戲規則；不為了取代幾十行規則而引入用途不明的 library。

## Source layout

```text
src/
  app/                      React app / MUI theme
  components/               Reusable UI components
  content/
    catalog.ts              Aggregate + reference validation only
    <character-id>.ts       CharacterDefinition + character-specific Skills
    viceLeaderSkill.ts      Shared cross-character Skill definition
    cards.ts                Card definitions
    match.ts                Standard match rules / deck / roster config
  game/
    contentRegistry.ts      Static GameContent interface
    gameDefinition.ts       GameDefinition / MatchRules boundary
    schema.ts               Zod schemas + domain types
    statuses.ts             Named runtime status keys and helpers
    engine.ts               Turn flow and core invariants
    skillRuntime.ts         Trigger / condition / usage dispatcher
    effectRegistry.ts       Reusable built-in effect handlers
    customEffects.ts        Escape hatch for unique mechanics
    cardHandlers.ts         Card-only custom handlers
  tutorial/
    config.ts               Fixed tutorial fixture data
    scenario.ts             Serializable tutorial state + semantic transitions
    runtime.ts              Tutorial game/session construction
    TutorialGuide.tsx       Scenario-driven guide UI
  store/gameStore.ts        Zustand + Immer integration
  tests/                    Vitest rules tests
public/assets/               Runtime art only
```

## Character content ownership

角色 authoring 採 **per-character package**：每個 `src/content/<character-id>.ts` 同時保存該角色的 `CharacterDefinition` 與角色專屬 `SkillDefinition`。角色的 stats、affinities、tags、source notes、Skill IDs 與 Skill 實作因此有單一 ownership boundary，不再分散在集中式 `characters.ts` / `skills.ts`。

只有真正被多個角色共用的內容才獨立成 shared module，例如三角希與流星共用的 `viceLeaderPower` 保留在 `viceLeaderSkill.ts`；不得為了形式一致把 shared Skill 複製到兩個角色 package。

`catalog.ts` 只負責：

- import 各角色 package 與 shared content；
- 聚合為 `CHARACTERS` / `SKILLS` / `CARDS`；
- resolve runtime asset path；
- 做 duplicate ID、missing Skill reference、forbidden gameplay Tag 等 validation。

`catalog.ts` 不應重新定義角色內容，也不應偷偷補 Skill 或轉換角色行為。

## Runtime flow

```text
Game action
   ↓
EngineSession emits SkillEvent
   ↓
SkillRuntime
   ├─ resolve subscriptions
   ├─ evaluate condition
   ├─ enforce usage limit
   └─ dispatch effects
          ↓
     EffectRegistry
          ↓
       GameState
```

角色 ID 不應出現在 `SkillRuntime` 或 `EngineSession` 的條件分支中。

## Tag boundary

`CharacterDefinition.tags` 只描述「角色是什麼」，不描述「角色會做什麼」。Tag 可以被 UI 顯示，也可以被 selector / condition 用來找出技能效果的合法對象；Tag 本身不得直接產生 gameplay behavior。

允許的用途：

- UI 顯示分類，例如 `leader`、`triangle-creature`、`editorial`。
- `taggedMember` 等 target selector 用 Tag 篩選技能目標。
- condition 以 Tag 判斷效果適用對象。

禁止的用途：

- `if (definition.tags.includes(...))` 後直接改變 Stress、骰子、能力值或作品。
- 用 Tag 禁止角色行動、阻止卡牌、提供免疫或修改權限。
- 用 Tag 決定 Standard / Boss 等 game mode 的出場資格。

任何會改變遊戲狀態、免疫、權限、行動限制或能力的規則都必須由 `SkillDefinition` 經 Skill / Effect runtime 實現；需要持續存在的效果可以由 Skill 套用 `CharacterState.statuses`。Game mode eligibility 屬於 `content/match.ts` 的 match configuration，而不是角色 Tag。

舊的 behavior-tag migration layer 已移除。Chaos、Weakzhi 等角色在 authoring source 中就直接列出真正的 Skill ID；catalog 不再 strip behavior tags 或自動補 Skill。`validateCatalog()` 只保留 forbidden behavior-tag guard，用來拒絕重新引入 `no-stress`、`cannot-act`、`not-standard-playable` 等錯誤資料模型。

## Immutable content and match state

`CharacterDefinition`、`SkillDefinition`、`CardDefinition` 是靜態內容，建立對局後不得為了當局效果修改 definition。

例如組長「Stress 上限 +2」屬於 match state：由 `CharacterState.statuses` 保存 `leader-stress-cap-bonus`，`EngineSession.getEffectiveMaxStress()` 計算有效上限。不同對局因此不會互相污染，也不需要 reset 時回寫全域 `CHARACTERS`。

UI setup state 也不得透過 module-level mutable variable 傳遞。組長選擇由 `DrawPhaseScreen -> App -> gameStore.startGame()` 明確傳入。

## GameContent and GameDefinition

`GameContent` 只描述靜態卡牌／角色／技能 registry：

```ts
interface GameContent {
  skills: Record<string, SkillDefinition>;
  characters: Record<string, CharacterDefinition>;
  cards: Record<string, CardDefinition>;
}
```

實際一局如何建立與執行，則由完整 `GameDefinition` 注入：

```ts
interface GameDefinition {
  id: string;
  content: GameContent;
  rules: MatchRules;
  deck: readonly string[];
  roster: {
    excludedCharacterIds: readonly string[];
  };
}
```

`MatchRules` 包含目前會影響 Engine 行為的 match constants，例如：

- `maxRounds`
- `teamSize`
- `initialHandSize`
- `cardsPerRound`
- `handLimit`
- `leaderStressBonus`
- `workLength`
- `missingWorkStatScore`
- player / enemy team name

Standard mode 由 `STANDARD_GAME_DEFINITION` 組合 `DEFAULT_CONTENT`、Standard deck、Standard roster eligibility 與 `DEFAULT_MATCH`。

`EngineSession`、`createInitialGame()`、`selectStandardRosters()`、`applyLeaderStressBonuses()` 都只接受完整 `GameDefinition`。不再支援傳入單獨 `GameContent` 後隱式套用 Standard rules / deck / roster config。

需要在測試或其他 mode 替換 content 時，必須明確建立 definition，例如：

```ts
const customDefinition = withGameContent(STANDARD_GAME_DEFINITION, customContent);
const engine = new EngineSession(state, rng, customDefinition);
```

這個邊界讓測試或未來 game mode 可以建立不同的：

- card / skill / character content pack
- team size
- round count
- hand limit / draw rate
- deck
- work length / scoring defaults
- roster eligibility

不需要修改 `EngineSession`，也不需要 mutation global catalog。

## Tutorial state boundary

Tutorial 不使用 module-global mutable cursor，也不讓 `App.tsx` 自己維護 progression state machine。

```text
UI interaction
   ↓
TutorialEvent
   ↓
reduceTutorialEvent(runtime, event)
   ↓
TutorialRuntimeState { step, randomIndex }
```

- `TUTORIAL_SCENARIO` 同時保存 guide copy、highlight selector 與 semantic transition。
- `TutorialRuntimeState` 是可 JSON serialize 的 plain data。
- deterministic RNG 由每局自己的 `randomIndex` 消耗固定 `TUTORIAL_DIE_RESULTS`，不同 session 互不共享 cursor。
- `App.tsx` 只回報 `actionChanged`、`diePlaced`、`skillResolved`、`cardResolved` 等事件，不直接指定下一個 step。
- `TutorialGuide` 與 controller 共用同一份 scenario definition。

詳細規則見 `src/tutorial/README.md`。

## Skill definition model

一般技能只需要 declarative data：

```ts
{
  id: 'triangleRecovery',
  name: '滾滾三角生物',
  description: '每回合開始時自身壓力 -1。',
  activation: 'triggered',
  status: 'implemented',
  triggers: [{
    event: 'roundStart',
    effects: [
      { kind: 'stress.change', target: 'owner', amount: -1 }
    ]
  }]
}
```

`SkillRuntime` 做四件事：

1. 收到 `SkillEvent`。
2. 從目前 `GameContent` 找出訂閱該 event 的技能。
3. 檢查 condition / target / usage limit。
4. 把 effects 交給 `EffectRegistry`。

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

## Condition coverage

- Boolean composition：`all / any / not`
- Relation：self / ally / other ally / enemy
- Owner stress comparison
- Owner effective stat comparison
- Round comparison
- Event amount / skill / source kind / metadata
- Dice batch matching
- Pending dice matching
- Owner status
- Work type
- Work score (`any` / `all` quantifier)
- Probability (`chance`)

## Effect coverage

### Stress / Event

- `stress.change`
- `stress.set`
- `event.amount`
- `event.cancel`

### Dice

- `dice.grant`
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

## Active target UI

`SkillActivationDialog` 依 `activeTarget` 自動生成常見 target picker：

- `none`
- `member`
- `work`
- `pendingDie`
- `copyPendingDie`

因此新增一個「選敵方角色」「選自己的作品」「選一顆骰」技能，不需要另外新增 React Dialog。

## Custom effect policy

只有既有 vocabulary 無法表達全新 mechanic 時才使用 `custom`：

1. 先確認是不是 selector / condition / generic effect 可以組合。
2. 若只是新的一般動作，新增 reusable effect kind。
3. 只有高度特殊、無重用價值的規則才註冊 custom handler。

任何 custom handler 都必須獨立測試，不應在 `engine.ts` 寫角色名稱判斷。

## Art assets

完整 concept sheet / browser mockup 不放進 runtime bundle。只保留實際引用的裁切素材：

- `public/assets/characters/*.webp`
- `public/assets/cards/*`

`CharacterCard` 與 `CardHand` 目前直接引用這些 assets。

## Character art boundary

角色卡的文字與遊戲資料屬於 React/MUI UI，不烘焙進圖片。runtime portrait 固定使用 `public/assets/characters/*.webp` 的 3:4 asset；`CharacterCard` 只負責 frame、stats、stress 與技能 UI。

這樣角色資料、美術與版面可以各自替換，不需要在新增角色時重新製作整張 raster card，也避免因 responsive layout 造成不規則裁切。詳細規格見 `CHARACTER_CARD_ART.md`。

## Standard roster / special resources

- `selectStandardRosters()` 依注入的 `GameDefinition.roster` 排除不參加該 mode 的角色；Standard mode 的設定來源仍是 `content/match.ts`。
- `CharacterState.resources` 可保存非 Stress resource；目前卡奧斯使用「體力」。
- 卡奧斯的壓力免疫由角色直接引用的 Skill 在 `gameStart` 套用 `stress-immune` status，不依角色 ID 或 Tag 特判。
- 弱智的行動／統籌限制同樣由角色直接引用的 Skill 在 `gameStart` 套用 runtime statuses。
- 組長 Stress 上限加成保存在當局 `CharacterState`，加成值由當局 `GameDefinition.rules.leaderStressBonus` 提供，不修改 `CHARACTERS`。
- 目前 custom effect 例子：`addRandomCardsByKind`（高興）與 `changeOwnerResource`（卡奧斯）。
- trigger event 已包含 `roundEnd` 與 `afterDiePlaced`。

目前實作狀態與美術尺寸請看 `PROJECT_STATUS.md`；架構規格不代表所有 legacy asset 已完成升級。
