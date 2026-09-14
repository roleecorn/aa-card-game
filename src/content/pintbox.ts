import '../game/characterSkillEffects';
import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const pintboxCharacter = characterDefinitionSchema.parse({
  id: 'pintbox',
  name: 'Pintbox',
  stats: { design: 2, text: 0, aa: 2 },
  maxStress: 5,
  affinities: ['謀'],
  skillIds: ['pintboxReview', 'pintboxBasicRequirements', 'pintboxAI'],
  tags: ['leader', 'review'],
  portrait: 'assets/characters/portrait/pintbox.webp',
  compactPortrait: 'assets/characters/compact/pintbox.webp',
  sourceNotes: [
    '2026-09-12：審稿改為不限次主動技能，重擲己方 pending dice 中所有 1、2；每重擲一顆，骰子來源壓力 +1。',
    '2026-09-12：自身壓力 >=3 時，自動重複觸發審稿，直到 pending dice 均不小於 3。',
    '2026-09-13：PintBox 再次確認角色技能版審稿與支援卡版可並存；本批只處理角色。',
  ],
});

export const pintboxSkills = skillDefinitionSchema.array().parse([
  {
    id: 'pintboxReview',
    name: '審稿',
    description: '不限次：指定己方一顆 1 或 2 的 pending die，重擲己方所有 1、2。每重擲一顆，骰子來源壓力 +1。',
    activation: 'active',
    status: 'implemented',
    activeTarget: { kind: 'pendingDie', relation: 'ally', maxValue: 2 },
    activeEffects: [{ kind: 'custom', handler: 'reviewLowPendingDice', args: { repeatUntilThree: false } }],
  },
  {
    id: 'pintboxBasicRequirements',
    name: '這只是基本的要求……',
    description: '自身壓力 >=3 時，己方有人工作骰出 1、2 就自動審稿，直到該批與 pending dice 都沒有 1、2。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'afterRollBatch',
      priority: 100,
      condition: {
        kind: 'all',
        conditions: [
          { kind: 'relation', field: 'actorId', relation: 'ally' },
          { kind: 'ownerStress', op: 'gte', value: 3 },
          { kind: 'diceMatch', maxValue: 2 },
        ],
      },
      effects: [{ kind: 'custom', handler: 'reviewLowPendingDice', args: { repeatUntilThree: true } }],
    }],
  },
  {
    id: 'pintboxAI',
    name: 'AI',
    description: '每回合第一次因其他人效果增加壓力時，增加量 -1（最低 0）。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'beforeExternalStress',
      priority: 100,
      usage: { scope: 'round', limit: 1, key: 'shield' },
      condition: {
        kind: 'all',
        conditions: [
          { kind: 'relation', field: 'targetId', relation: 'self' },
          { kind: 'eventAmount', op: 'gt', value: 0 },
          { kind: 'not', condition: { kind: 'relation', field: 'sourceId', relation: 'self' } },
        ],
      },
      effects: [{ kind: 'event.amount', amount: -1, min: 0 }],
    }],
  },
]);
