import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const patrickCharacter = characterDefinitionSchema.parse({
  id: 'patrick',
  name: '派大星',
  stats: { design: 0, text: 0, aa: 1 },
  maxStress: 3,
  affinities: [],
  skillIds: [],
  tags: ['systems-thinker', 'review'],
  portrait: '/assets/characters/portrait/patrick.webp',
  compactPortrait: '/assets/characters/compact/patrick.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '本角色不是 PintBox 已有卡面設計；依使用者指定 fallback 規則，從 dataset(1).zip 的發言 reply graph 選出。',
    '派大星（.dapie）reply graph degree = 524，為排除既有角色與前四名 PintBox 直接設計候選後，互動度最高的明確未實裝使用者。',
    '2026-09-10 角色校正：Design / Text / AA 定為 0 / 0 / 1、壓力上限 3、無作品適性、無技能。',
  ],
});

export const patrickSkills = skillDefinitionSchema.array().parse([
  {
    id: 'patrickConsistencyCheck',
    name: '一致性檢查',
    description: '每回合一次，重擲自己作品中目前最低的一顆已填入骰。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [{ kind: 'work.progress.rerollLowest', target: 'ownerWork', count: 1 }],
    tags: ['prototype', 'review'],
  },
]);
