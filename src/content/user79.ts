import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const user79Character = characterDefinitionSchema.parse({
  id: 'user79',
  name: '79',
  stats: { design: 2, text: 3, aa: 2 },
  maxStress: 4,
  affinities: ['燃', '謀'],
  skillIds: ['resonance79', 'burningText79'],
  portrait: 'assets/characters/portrait/user79.webp',
  compactPortrait: 'assets/characters/compact/user79.webp',
  sourceNotes: [
    '2026-09-03 23:06:59：Text 3、Design 2、AA 2、壓力上限 4。',
    '2026-09-10 角色校正：移除「虛之會圈」，改為與格林類似的燃燒型技能；自身 +1 壓力並令一顆 Text 骰 +2。',
  ],
});

export const user79Skills = skillDefinitionSchema.array().parse([
  {
    id: 'resonance79',
    name: '共鳴',
    description: '其他組員擲額外 Design 骰時，自身可額外擲等量骰。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
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
    }],
  },
  {
    id: 'burningText79',
    name: '燃燒文字',
    description: '選擇自己一顆尚未分配的 Text 骰：自身壓力 +1，該骰 +2（最高 6）。可重複使用；壓力爆表仍依共通規則處理。',
    activation: 'active',
    status: 'implemented',
    activeHint: '選擇 79 自己尚未分配的 Text 骰。',
    activeTarget: { kind: 'pendingDie', relation: 'self' },
    activeEffects: [
      { kind: 'stress.change', target: 'owner', amount: 1, source: '燃燒文字' },
      { kind: 'dice.modifySelected', add: 2 },
    ],
    tags: ['stress-tradeoff', 'text'],
  },
]);
