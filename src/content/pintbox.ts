import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const pintboxCharacter = characterDefinitionSchema.parse({
  id: 'pintbox',
  name: 'Pintbox',
  stats: { design: 2, text: 0, aa: 2 },
  maxStress: 5,
  affinities: ['謀'],
  skillIds: ['pintboxReview', 'pintboxAI'],
  tags: ['leader', 'review'],
  portrait: 'assets/characters/portrait/pintbox.webp',
  compactPortrait: 'assets/characters/compact/pintbox.webp',
  sourceNotes: [
    '2026-09-03 07:24:17：Design 2、AA 2、壓力上限 5。',
    'Text 未在目前整理紀錄中明確列出；prototype 暫用 0。',
    '2026-09-10 角色校正：作品適性定案為僅（謀）。',
  ],
});

export const pintboxSkills = skillDefinitionSchema.array().parse([
  {
    id: 'pintboxReview',
    name: '這只是基本的要求……',
    description: '組員骰出 1 或 2 時，可令其壓力 +1 並重骰；Pintbox 自身壓力 3 以上時必須發動。',
    activation: 'triggered',
    status: 'partial',
    triggers: [{
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
        ],
      },
      effects: [{ kind: 'event.amount', amount: -1, min: 0 }],
    }],
  },
]);
