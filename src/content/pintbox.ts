import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const pintboxCharacter = characterDefinitionSchema.parse({
  id: 'pintbox',
  name: 'Pintbox',
  stats: { design: 2, text: 0, aa: 2 },
  maxStress: 5,
  affinities: ['謀'],
  skillIds: ['pintboxBasicRequirements', 'pintboxAI'],
  tags: ['leader', 'review'],
  portrait: 'assets/characters/portrait/pintbox.webp',
  compactPortrait: 'assets/characters/compact/pintbox.webp',
  sourceNotes: [
    '2026-09-16 final：「這只是基本的要求……」每回合一次，逐一處理全隊所有 1 / 2 pending dice。',
    '每名有低點骰的角色先 Stress +1，再一次重擲其所有 1 / 2；若仍有 1 / 2 則重複。',
    '若 Stress 增加超過上限，共通規則先清除該角色 pending dice，已清除骰不再重擲。',
    '「AI」每回合第一次因工作與使用統籌卡以外原因增加 Stress 時，該次增加量 -1，最低 0。',
    '舊主動「審稿」與 Stress >= 3 自動審稿已被本版覆蓋。',
  ],
});

export const pintboxSkills = skillDefinitionSchema.array().parse([
  {
    id: 'pintboxBasicRequirements',
    name: '這只是基本的要求……',
    description: '每回合一次：逐一處理我方所有有 1 / 2 pending dice 的角色；該角色 Stress +1，重擲其全部 1 / 2，仍有低點則重複。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeCondition: { kind: 'pendingDice', target: 'allAllies', maxValue: 2, countAtLeast: 1 },
    activeEffects: [{ kind: 'custom', handler: 'pintboxTeamReview' }],
  },
  {
    id: 'pintboxAI',
    name: 'AI',
    description: '每回合第一次因「工作」與「使用統籌卡」以外原因增加 Stress 時，該次增加量 -1（最低 0）。',
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
          { kind: 'not', condition: { kind: 'sourceKind', value: '使用統籌卡' } },
        ],
      },
      effects: [{ kind: 'event.amount', amount: -1, min: 0 }],
    }],
  },
]);
