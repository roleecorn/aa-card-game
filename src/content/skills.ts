import { skillDefinitionSchema } from '../game/schema';

export const skillList = skillDefinitionSchema.array().parse([
  {
    id: 'pintboxReview',
    name: '這只是基本的要求……',
    description: '己方工作擲骰出現低骰時，以該組員壓力 +1 換取一次重擲；Pintbox 壓力達 3 時會處理 1–2，否則只處理 1。',
    activation: 'triggered',
    status: 'implemented',
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
      {
        event: 'afterRollBatch',
        priority: 20,
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'actorId', relation: 'ally' },
            { kind: 'ownerStress', op: 'lte', value: 2 },
            { kind: 'diceMatch', maxValue: 1 },
          ],
        },
        effects: [
          { kind: 'stress.change', target: 'eventActor', amount: 1, source: 'Pintbox 審稿' },
          { kind: 'dice.rerollBatch', count: 1, maxValue: 1, lowestFirst: true },
        ],
      },
    ],
  },
  {
    id: 'pintboxAI',
    name: 'AI',
    description: '每回合第一次因外部效果增加壓力時，增加量 -1（最低 0）。',
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
    description: '每回合一次，把自己一顆尚未分配的骰改成另一名己方組員一顆尚未分配骰的數值。',
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
    description: '其他己方組員獲得額外 Design 骰時，79 也獲得等量 Design 骰。',
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
    description: '遊戲開始時額外獲得兩張「語音會議」。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'gameStart', effects: [{ kind: 'cards.add', cardId: 'voice', count: 2 }] }],
  },
  {
    id: 'triangleRecovery',
    name: '滾滾三角生物',
    description: '每回合開始時自身壓力 -1。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'roundStart', effects: [{ kind: 'stress.change', target: 'owner', amount: -1, source: '滾滾三角生物' }] }],
  },
  {
    id: 'triangleAffinity',
    name: '適應力',
    description: '視為擁有全部作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'commercialAuthor',
    name: '商業作者',
    description: '所有骰子最低為 4。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'roll.floor', value: 4 }],
  },
  {
    id: 'bluewindDelusion',
    name: '妄想全開',
    description: '每回合一次：獲得 2 顆 Design 骰、自己的作品篇幅 +1、自身壓力 -1。',
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
    description: '討論中提到可增加骰子並可能把參與作品轉為（笑）；細節尚未定案。',
    activation: 'active',
    status: 'planned',
  },
  {
    id: 'narratorLongForm',
    name: '超長發揮',
    description: '超出篇幅時增加作品長度；觸發條件仍需依規則定稿。',
    activation: 'triggered',
    status: 'planned',
  },
  {
    id: 'ginsakuraRise',
    name: '起來',
    description: '等待正式規則；effect system 已具備 event.cancel / stress.change / dice.modifyPending，可直接組裝。',
    activation: 'triggered',
    status: 'planned',
  },
  {
    id: 'ginsakuraSupport',
    name: '愉悅的支援者',
    description: '等待正式規則；可由 dice.modifyPending / dice.copySelectedValue / stress.change 組裝。',
    activation: 'active',
    status: 'planned',
  },
]);
