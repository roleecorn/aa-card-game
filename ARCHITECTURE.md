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
    skills.ts               Skill definitions
    characters.ts           Character definitions
    cards.ts                Card definitions
    match.ts                Default match / deck config
  game/
    contentRegistry.ts      Injectable GameContent interface
    schema.ts               Zod schemas + domain types
    engine.ts               Turn flow and core invariants
    skillRuntime.ts         Trigger / condition / usage dispatcher
    effectRegistry.ts       Reusable built-in effect handlers
    customEffects.ts        Escape hatch for unique mechanics
    cardHandlers.ts         Card-only custom handlers
  store/gameStore.ts        Zustand + Immer integration
  tests/                    Vitest rules tests
public/assets/               Runtime art only
```

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

## Injectable GameContent

`EngineSession` 接受 `GameContent`：

```ts
interface GameContent {
  skills: Record<string, SkillDefinition>;
  characters: Record<string, CharacterDefinition>;
  cards: Record<string, CardDefinition>;
}
```

預設 UI 使用 `DEFAULT_CONTENT`，但測試或未來 game mode 可以傳入另一份 registry。這代表：

- 可建立不同 card set。
- 可建立 prototype-only skill pack。
- 可做 balance test，不修改 global catalog。
- 未來多人房間可依房間規則載入不同 content pack。

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

- `public/assets/characters/*.png`
- `public/assets/cards/*.png`

`CharacterCard` 與 `CardHand` 目前直接引用這些 assets。


## Character art boundary

角色卡的文字與遊戲資料屬於 React/MUI UI，不烘焙進圖片。runtime portrait 固定使用 `public/assets/characters/*.webp` 的 3:4 asset；`CharacterCard` 只負責 frame、stats、stress 與技能 UI。

這樣角色資料、美術與版面可以各自替換，不需要在新增角色時重新製作整張 raster card，也避免因 responsive layout 造成不規則裁切。詳細規格見 `CHARACTER_CARD_ART.md`。
