import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const eCharacter = characterDefinitionSchema.parse({
  id: 'e',
  name: 'E',
  stats: { design: 3, text: 2, aa: 0 },
  maxStress: 4,
  affinities: [],
  skillIds: ['eHiredWriter', 'eSelectedJokes'],
  portrait: 'assets/characters/portrait/e.webp',
  compactPortrait: 'assets/characters/compact/e.webp',
  sourceNotes: [
    '2026-09-16 final：Design 3 / Text 2 / AA 0，Stress 4。',
    '「全適性」擁有所有現行有效作品類型適性；已移除的「色」不在其中。',
    '「39萬條精選段子」改為我方每一部類型包含「笑」的作品都讓自身 Text +1；支援 additive multi-type。',
    '舊版「自己的作品為笑時固定 Text +3」已被覆蓋。',
  ],
});

export const eSkills = skillDefinitionSchema.array().parse([
  {
    id: 'eHiredWriter',
    name: '全適性',
    description: '擁有所有現行有效作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'eSelectedJokes',
    name: '39萬條精選段子',
    description: '我方每有 1 部類型包含「笑」的作品，自身 Text +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.workTypeCount', skill: 'text', workType: '笑', amountPerWork: 1 }],
  },
]);
