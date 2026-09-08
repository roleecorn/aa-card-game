# Skill Authoring

新增技能時優先使用 declarative definition，不要先修改 `EngineSession`。

## 1. 選 activation 類型

### Passive

適合持續規則，例如適性或最低骰值：

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
  activeTarget: { kind: 'pendingDie', relation: 'self' },
  activeEffects: [{ kind: 'dice.modifySelected', add: 1 }]
}
```

## 2. 用 condition 組規則

```ts
condition: {
  kind: 'all',
  conditions: [
    { kind: 'round', op: 'gte', value: 3 },
    { kind: 'ownerStress', op: 'lte', value: 2 },
    { kind: 'pendingDice', target: 'owner', skill: 'text', countAtLeast: 1 }
  ]
}
```

如果是 OR 使用 `any`，反向條件使用 `not`。

## 3. 用 selector 選目標

常用例子：

```ts
{ kind: 'stress.change', target: 'highestStressAlly', amount: -2 }
{ kind: 'dice.grant', target: 'randomOtherAlly', skill: 'design', count: 1 }
{ kind: 'work.length', target: 'lowestScoreAllyWork', amount: -1, min: 1 }
```

Triggered skill 通常靠 selector 自動找目標；Active skill 若需要玩家選擇，使用 `activeTarget`。

## 4. 一個技能可以組多個 effects

```ts
activeEffects: [
  { kind: 'stress.change', target: 'owner', amount: -1 },
  { kind: 'dice.grant', target: 'owner', skill: 'design', count: 2 },
  { kind: 'work.length', target: 'ownerWork', amount: 1 }
]
```

這是藍風「妄想全開」目前採用的模式。

## 5. 限制使用次數

```ts
activeUsage: { scope: 'round', limit: 1 }
```

或：

```ts
usage: { scope: 'game', limit: 2, key: 'shield' }
```

## 6. 加入角色

技能加入 `src/content/skills.ts` 後，只需把 skill ID 加到角色：

```ts
{
  id: 'newCharacter',
  // ...
  skillIds: ['recoverOnRoundStart', 'fixOneDie']
}
```

`catalog.ts` 會在啟動時驗證角色是否引用不存在的技能。

## 7. 什麼時候才寫 custom handler

先問：

- 是否只是壓力、骰子、能力、作品、進度、卡牌、status 的組合？
- 是否可增加一個會被其他角色重用的 generic effect？
- 是否只差一個 selector 或 condition？

只有答案都是否，才新增 custom handler。

禁止在 `engine.ts` 加：

```ts
if (character.id === 'someCharacter') {
  // unique skill logic
}
```

## 8. 測試

至少測：

- 觸發條件成立時會生效。
- 條件不成立時不生效。
- 每回合 / 每局 usage limit。
- target relation。
- 若涉及 random，使用 deterministic RNG。

v0.3 的測試也包含一個 injected `GameContent` 技能，證明新增技能不需要修改 `EngineSession`。
