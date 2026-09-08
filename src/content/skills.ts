import { skillDefinitionSchema } from '../game/schema';

export const skillList = skillDefinitionSchema.array().parse([
  {
    id: 'pintboxReview',
    name: '這只是基本的要求……',
    description: '組員骰出 1 或 2 時，可令其壓力 +1 並重骰；Pintbox 自身壓力 3 以上時必須發動。',
    activation: 'triggered',
    status: 'partial',
    triggers: [
      {
        event: 'afterRollBatch',
        priority: 20,
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'actorId', relation: 'ally' },
            { kind: 'ownerStress', op: 'gte', value: 3 },
            { kind: 'diceMatch', maxValue: 2 },
          ],
        },
        effects: [
          { kind: 'stress.change', target: 'eventActor', amount: 1, source: 'Pintbox 審稿' },
          { kind: 'dice.rerollBatch', count: 1, maxValue: 2, lowestFirst: true },
        ],
      },
    ],
  },
  {
    id: 'pintboxAI',
    name: 'AI',
    description: '每回合第一次因其他人效果增加壓力時，增加量 -1（最低 0）。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'beforeExternalStress',
        priority: 100,
        usage: { scope: 'round', limit: 1, key: 'shield' },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'targetId', relation: 'self' },
            { kind: 'eventAmount', op: 'gt', value: 0 },
          ],
        },
        effects: [{ kind: 'event.amount', amount: -1, min: 0 }],
      },
    ],
  },
  {
    id: 'mashiroAffinity',
    name: '對待工作的態度',
    description: '視為擁有全部作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'mashiroSynthesis',
    name: '融會貫通',
    description: '每回合一次，可把自己一顆骰改成另一組員的一顆骰值。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeHint: '選擇另一名組員的骰作為來源，再選真白自己的骰作為目標。',
    activeTarget: { kind: 'copyPendingDie', source: 'otherAlly', target: 'self' },
    activeEffects: [{ kind: 'dice.copySelectedValue', source: 'selectedSourceDie', target: 'selectedTargetDie' }],
  },
  {
    id: 'resonance79',
    name: '共鳴',
    description: '其他組員擲額外 Design 骰時，自身可額外擲等量骰。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'afterDiceGranted',
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'targetId', relation: 'otherAlly' },
            { kind: 'eventSkill', skill: 'design' },
            { kind: 'eventMeta', key: 'extra', equals: true },
          ],
        },
        effects: [
          { kind: 'dice.grant', target: 'owner', skill: 'design', count: { fromEvent: 'amount' }, origin: '共鳴', extra: true },
        ],
      },
    ],
  },
  {
    id: 'virtualCircle79',
    name: '虛之會圈',
    description: '遊戲開始時額外取得兩張「語音會議」。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'gameStart', effects: [{ kind: 'cards.add', cardId: 'voice', count: 2 }] }],
  },
  {
    id: 'triangleRecovery',
    name: '滾滾三角生物',
    description: '每回合開始時，三角希＆有希的壓力 -1。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'roundStart', effects: [{ kind: 'stress.change', target: 'owner', amount: -1, source: '滾滾三角生物' }] }],
  },
  {
    id: 'triangleAffinity',
    name: '全作品適性',
    description: '視為擁有全部作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'triangleCoordination',
    name: '統籌權限',
    description: '可以使用統籌卡；目前 team-level 出牌尚未記錄實際使用角色，因此權限檢查保留為規劃中。',
    activation: 'passive',
    status: 'planned',
    passives: [{ kind: 'card.permission', cardKind: 'coordination' }],
  },
  {
    id: 'commercialAuthor',
    name: '商業作者',
    description: '不會擲出 3 以下。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'roll.floor', value: 3 }],
  },
  {
    id: 'bluewindDelusion',
    name: '妄想全開',
    description: '擲 2 顆 Design 骰、作品篇幅 +1、自身壓力 -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    ai: { autoUse: true, when: 'ownerStressed' },
    activeEffects: [
      { kind: 'dice.grant', target: 'owner', skill: 'design', count: 2, origin: '妄想全開', extra: true },
      { kind: 'work.length', target: 'ownerWork', amount: 1 },
      { kind: 'stress.change', target: 'owner', amount: -1, source: '妄想全開' },
    ],
  },
  {
    id: 'narratorOsaka',
    name: '中國大阪人',
    description: '可增加骰子，但會使參與的作品轉為（笑）。',
    activation: 'active',
    status: 'planned',
  },
  {
    id: 'narratorLongForm',
    name: '超長發揮',
    description: '超出篇幅的判定骰會增加作品長度。',
    activation: 'triggered',
    status: 'planned',
  },
  {
    id: 'ginsakuraRise',
    name: '起來',
    description: '可以反制外部骰子效果；目前整理紀錄沒有完整觸發條件與數值。',
    activation: 'triggered',
    status: 'planned',
  },
  {
    id: 'ginsakuraSupport',
    name: '愉悅的支援者',
    description: '可以用自己的骰替換別人的骰，並使自己降低壓力；目前整理紀錄沒有完整替換限制與降壓數值。',
    activation: 'active',
    status: 'planned',
  },
  {
    id: 'happyContagion',
    name: '高興',
    description: '高興將自己的骰放入作品後，該作品類型變為「怪」。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'afterDiePlaced',
        condition: { kind: 'relation', field: 'actorId', relation: 'self' },
        effects: [{ kind: 'work.type', target: 'eventWork', workType: '怪' }],
      },
    ],
  },
  {
    id: 'happyEditor',
    name: '編輯長',
    description: '遊戲開始時額外取得三張統籌卡。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'gameStart',
        effects: [
          {
            kind: 'custom',
            handler: 'addRandomCardsByKind',
            args: { cardKind: 'coordination', count: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'chaosSteadyRoll',
    name: 'Boss 級穩定輸出',
    description: '不會擲出 3 以下。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'roll.floor', value: 3 }],
  },
  {
    id: 'chaosVitality',
    name: 'Boss 體力',
    description: '體力 5，沒有壓力條；每回合體力 -1。',
    activation: 'triggered',
    status: 'planned',
  },
]);
