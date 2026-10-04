import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const narratorCharacter = characterDefinitionSchema.parse({
  id: 'narrator',
  name: '旁白',
  stats: { design: 1, text: 3, aa: 1 },
  maxStress: 5,
  affinities: ['情', '燃', '笑', '怪'],
  skillIds: ['narratorLongForm', 'narratorOsaka'],
  portrait: 'assets/characters/portrait/narrator.webp',
  compactPortrait: 'assets/characters/compact/narrator.webp',
  sourceNotes: [
    '2026-09-14 final：Design 1 / Text 3 / AA 1；適性（情 / 燃 / 笑 / 怪）。',
    '此次未重述 Stress 上限，因此保留既有 5。',
    '「超長段子手」每回合一次：2 顆 Text、自己作品篇幅 +1、自身 Stress -1。',
    '「大鱷魚的召喚」每回合一次：指定我方作品加入 1d6 Design，作品類型 replace 成（笑）。',
  ],
});

export const narratorSkills = skillDefinitionSchema.array().parse([
  {
    id: 'narratorLongForm',
    name: '超長段子手',
    description: '每回合一次：獲得 2 顆 Text 骰，自己的作品篇幅 +1，自身 Stress -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [
      { kind: 'dice.grant', target: 'owner', skill: 'text', count: 2, origin: '超長段子手', extra: true },
      { kind: 'work.length', target: 'ownerWork', amount: 1 },
      { kind: 'stress.change', target: 'owner', amount: -1, source: '超長段子手' },
    ],
  },
  {
    id: 'narratorOsaka',
    name: '大鱷魚的召喚',
    description: '每回合一次：指定一部我方作品，加入 1d6 Design 骰，並將作品類型改為（笑）。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'work', relation: 'ally' },
    activeCondition: { kind: 'workHasEmptyProgress', target: 'selectedWork', skill: 'design' },
    activeEffects: [{ kind: 'custom', handler: 'narratorAlligator' }],
  },
]);
