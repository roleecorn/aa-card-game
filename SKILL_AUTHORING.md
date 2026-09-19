# Skill Authoring

新增／修改技能時，優先使用 declarative definition，不要先修改 `EngineSession`。目前 Active skill 的可用性與 target legality 由 `SkillRuntime` 統一判定；UI 不應建立第二套角色特判。

## 1. 選 activation 類型

### Passive

適合持續規則，例如適性、最低骰值、effect immunity 或 coordination stress bearer：

```ts
{
  id: 'allAffinity',
  name: '全能適性',
  description: '視為擁有全部作品適性。',
  activation: 'passive',
  status: 'implemented',
  passives: [{ kind: 'affinity.grant', types: 'all' }]
}
```

若同一能力同時需要 event runtime 與 UI／targeting 判斷，可以在同一 Skill 放 `passives` 與 `triggers`。

`effect.immunity` 是 **effect resolution** 規則，不是 target validation 規則：免疫角色仍可被合法指定，只是落在它身上的 effect no-op。真正「不能指定」必須由 target rule 或 runtime status 表達。

### Triggered

適合收到 game event 自動觸發：

```ts
{
  id: 'recoverOnRoundStart',
  name: '回神',
  description: '每回合開始壓力 -1。',
  activation: 'triggered',
  status: 'implemented',
  triggers: [{
    event: 'roundStart',
    effects: [{ kind: 'stress.change', target: 'owner', amount: -1 }]
  }]
}
```

### Active

適合玩家主動使用：

```ts
{
  id: 'fixOneDie',
  name: '精準修正',
  description: '每回合一次，自己的指定骰 +1。',
  activation: 'active',
  status: 'implemented',
  activeUsage: { scope: 'round', limit: 1 },
  activeTarget: { kind: 'pendingDie', relation: 'self', maxValue: 5 },
  activeEffects: [{ kind: 'dice.modifySelected', add: 1 }]
}
```

如果沒有任何合法 target，`canUseActive()` 應該直接回 false，而不是讓玩家先進 dialog 再失敗。

## 2. Active target 與 activeCondition 的責任

`activeTarget` 表達「**要選什麼，而且這個目標本身是否合法**」：

- kind：`none / member / taggedMember / work / pendingDie / copyPendingDie`
- relation：self / ally / otherAlly / enemy / owner 等
- pending die 的 `skill / minValue / maxValue`
- tag / excludeSelf 等 target structure

`activeCondition` 表達「**發動前置條件是否成立**」，尤其是不能只靠 target structure 表達的規則：

```ts
{
  activeCondition: {
    kind: 'all',
    conditions: [
      { kind: 'workType', target: 'ownerWork', types: ['燃'] },
      { kind: 'pendingDice', target: 'owner', countAtLeast: 1 },
    ],
  },
}
```

目前常用 condition 還包括：

- `ownerStress`
- `memberStress`
- `ownerStat`
- `round`
- `eventAmount / eventSkill / sourceKind / eventMeta`
- `diceMatch / pendingDice`
- `ownerStatus`
- `workType`
- `workScore`
- `workLength`
- `workHasProgress`
- `chance`
- `all / any / not`

### 不要把可用條件藏在 custom handler

如果規則是「作品必須是（燃）」「作品至少長度 2」「目標至少有 1 Stress」「要存在 Design progress」等，必須優先用 `activeCondition` / `activeTarget` 表達。

Custom handler 可以再次 defensive validate，但不能讓 UI/`canUseActive()` 只能等到 handler 執行後才知道其實不能用。

## 3. Runtime 是 target legality 的單一來源

所有 UI target candidate 最終必須委派：

```ts
engine.skills.canActivateSkillTarget(memberId, skillId, target)
```

`targeting.ts` 可以提供更具體的人類可讀原因，但不能自行複製一份角色規則或使用 skill ID 特判。

必須維持這個 invariant：

> UI 標示 allowed 的 target，必須能被同一 runtime validator 接受。

新增 target kind 時，必須同步：

1. schema/type。
2. `SkillRuntime` structure validation。
3. `targeting.ts` / `SkillActivationDialog` candidate generation。
4. runtime-target consistency test。

## 4. 用 selector 選目標

常用例子：

```ts
{ kind: 'stress.change', target: 'highestStressAlly', amount: -2 }
{ kind: 'dice.grant', target: 'randomOtherAlly', skill: 'design', count: 1 }
{ kind: 'work.length', target: 'lowestScoreAllyWork', amount: -1, min: 1 }
```

Triggered skill 通常靠 selector 自動找目標；Active skill 若需要玩家選擇，使用 `activeTarget`。

## 5. 一個技能可以組多個 effects

```ts
activeEffects: [
  { kind: 'stress.change', target: 'owner', amount: -1 },
  { kind: 'dice.grant', target: 'owner', skill: 'design', count: 2 },
  { kind: 'work.length', target: 'ownerWork', amount: 1 }
]
```

優先組合 generic effects，只有既有 vocabulary 真正無法表達時才寫 custom handler。

## 6. Usage limit 與共享 usage group

單一技能：

```ts
activeUsage: { scope: 'round', limit: 1 }
```

Triggered usage：

```ts
usage: { scope: 'game', limit: 2, key: 'shield' }
```

多個 Active skill 共享同一 quota：

```ts
activeUsage: { scope: 'game', limit: 2, group: 'adaoAdjustLength' }
```

同一 `group` 會共用 counter；不要在 custom handler 再建立另一份隱藏 `skillUsage` key。阿道「加長／縮短」就是此模式。

## 7. Event payload 是 contract

Triggered skill 依賴 event data 時，event emitter 必須真的提供該欄位。

目前常見欄位：

- `actorId`
- `targetId`
- `sourceId`
- `workId`
- `dieId`
- `skill`
- `amount`
- `dice`
- `sourceKind`
- `metadata`

例如：

- `afterDiePlaced` 需要 slot 資訊時使用 `metadata.slotIndex`；真實 `placeDie()` emitter 必須帶它。
- `cardPlayed` 需要判斷實際被指定角色時，必須帶 `targetId`，不能只帶 card actor。

**測試不能只人工 construct 一個比 production emitter 更完整的 event。** 只要技能依賴某 event field，至少要有一個 integration regression 透過真實 Engine action 產生該 event。

## 8. Coordination stress bearer

`coordination.stressBearer` passive 用來在統籌卡共通 +1 Stress **結算前**決定替代承擔者，不改變 card actor identity。

```ts
passives: [
  { kind: 'coordination.stressBearer', allowEqual: true }
]
```

- `allowEqual: false`：候選角色 Stress 必須嚴格低於組長。
- `allowEqual: true`：候選角色 Stress 可以小於或等於組長。
- hidden 角色不能成為 stress bearer。
- 多名候選時 runtime 只選一名，不應讓多個副組長技能各自搬一次 Stress。

不要用 `cardPlayed` 之後「先減組長再加副組長」的方式模擬，因為會和其他 stress bearer、immunity、跨隊 event 產生 ordering bug。

## 9. 加入角色

角色專屬 Skill 應與 `CharacterDefinition` 放在同一個 `src/content/<character-id>.ts` package；只有真正跨角色共用的 Skill 才放 shared module。

技能定義完成後，直接把 skill ID 加到角色：

```ts
{
  id: 'newCharacter',
  skillIds: ['recoverOnRoundStart', 'fixOneDie']
}
```

`catalog.ts` 會驗證角色 reference；不要依賴 runtime migration 偷補 Skill。

## 10. Custom handler policy

先問：

- 是否只是壓力、骰子、能力、作品、進度、卡牌、status 的組合？
- 是否只缺 selector / condition / generic effect？
- 新 mechanic 是否有跨角色重用價值？

只有既有 vocabulary 不足時才使用 `custom`。

禁止在 `engine.ts` 加：

```ts
if (character.id === 'someCharacter') {
  // unique skill logic
}
```

### Registry contract

Custom skill handler 必須使用 `registerCustomSkillEffect(name, handler)` 註冊。

Runtime registry 目前有兩個 hard contract：

1. 所有非-planned Skill 所引用的 custom handler 必須能由 live registry 查到。
2. 同一 handler name 重複註冊會直接 throw，不能靜默 overwrite。

角色 custom handler 的載入要經正式 bootstrap path；不要讓測試只用 regex 掃 source code 判斷「字串看起來存在」。

## 11. 測試架構

### Isolated skill harness

新增／修改單一角色技能時，優先使用 `src/tests/helpers/skillHarness.ts` 的 neutral fixtures，把被測角色和沒有技能副作用的隊友／對手組合在一起。

原因：使用真實多角色 roster 當 filler，其他角色的被動或 trigger 可能碰巧滿足 assertion，造成 false positive。

### Minimum behavior coverage

至少測：

- 條件成立時生效。
- 條件不成立時不生效。
- round/game/shared usage limit。
- target relation 與 target filters。
- no-op 情況不可錯誤顯示可發動。
- random 使用 deterministic RNG。
- event payload 用真實 emitter 驗證。
- 若可能和其他角色交互，加入 cross-character interaction test。

### Contract suites

目前至少維持：

- `skill-contracts.test.ts`
  - implemented skill 必須有 executable behavior；
  - referenced custom handlers 必須存在於 live registry；
  - duplicate custom-handler registration fail-fast；
  - `planned` skill status 不得被誤用為 roster exclusion；旁白與銀櫻必須留在 Standard selection pool，以便真實對局測試；
  - shared usage group 等 schema contract。
- `skill-runtime-regressions.test.ts`
  - 真實 skill/event interaction regressions。
- `skill-targeting-contracts.test.ts`
  - UI availability / candidate 與 runtime validator 一致。

既有大型 `skills.test.ts` 可以保留 broad regression，但不能成為單一可信來源。

## 12. AI authoring boundary

Standard AI 目前只會自動使用：

- `skill.ai.autoUse === true`
- Active skill
- `activeTarget.kind === 'none'`

需要選 member / work / die 的 Active skill 目前沒有通用 AI target chooser。若新增 AI 必須能使用的指定型技能，不能只在 SkillDefinition 加 `ai.autoUse` 就宣稱完成；需同步擴充 AI target policy 與 tests。

## 13. Documentation gate

修改角色數值、適性、Stress、Skill 行為／狀態、card effect/target、match rule、roster eligibility 或 gameplay vocabulary 時，必須在**同一個 PR**同步更新對應文件。

至少檢查：

- `GAME_RULES.md`
- `GAME_MANUAL.md`
- `PROJECT_STATUS.md`
- `README.md`
- 若為 schema / authoring vocabulary：本文件與 `ARCHITECTURE.md`
- 若影響 Online：`ONLINE_MULTIPLAYER.md`

完整 mapping 與 mandatory policy 見 `AGENTS.md`。

## 14. 目前的 special mechanics

- Trigger event 包含 `roundEnd`、`afterDiePlaced`、`cardPlayed` 等。
- 卡牌 actor 固定由當前 `TeamState.leaderId` 推導。
- `coordination.stressBearer` 可改變統籌卡 Stress bearer，但不改 card actor。
- `effect.immunity` 是 effect-resolution 規則，不等同 untargetable。
- `CharacterDefinition.resource` / `CharacterState.resources` 可處理特殊資源。
- Character Tag 只可作 metadata / selector / condition；不能承載 gameplay restriction 或 roster eligibility。
- Standard / special mode eligibility 放在 match configuration。
- `planned` 是 skill implementation status，不是 mode eligibility；是否排除角色只能由 match configuration 明確決定。

`status: implemented` 必須有真正 runtime effect 與 tests；資料或文案存在但未完整執行時維持 `partial` / `planned`。

## 2026-09-19 vocabulary additions

New gameplay vocabulary:

- `work.type.add`: add a work type without replacing its primary type.
- `roll.forbid` effect: forbid one or more die faces for selected members through the current round.
- `roll.forbid` passive: permanently forbid one or more faces for a character.

`work.type` remains a replace operation and clears additive extra types. Work-type conditions now match any type currently carried by the work.
