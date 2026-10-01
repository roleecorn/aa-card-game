import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const meteorCharacter = characterDefinitionSchema.parse({
  id: 'meteor',
  name: '流星',
  stats: { design: 0, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['燃'],
  skillIds: ['meteorBurnDesign', 'meteorResonance', 'viceLeaderPower'],
  portrait: 'assets/characters/portrait/meteor.webp',
  compactPortrait: 'assets/characters/compact/meteor.webp',
  sourceNotes: [
    '2026-09-16 final：Design 0 / Text 1 / AA 2，Stress 4，適性（燃）。',
    '「軌之共鳴」：我方每一部類型包含「燃」的作品讓自身 Design +1。',
    '「軌言軌語」：自身 Design -1；最終 Design 仍以 0 為下限。',
    '「副組長力」保留並使用共通 headroom 規則。',
    '舊版「自己的燃作品 +1」與每回合 reroll 已被覆蓋。',
  ],
});

export const meteorSkills = skillDefinitionSchema.array().parse([
  {
    id: 'meteorBurnDesign',
    name: '軌言軌語',
    description: '自身 Design -1；最終總 Design 最低為 0。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.modify', skill: 'design', amount: -1 }],
  },
  {
    id: 'meteorResonance',
    name: '軌之共鳴',
    description: '我方每有 1 部類型包含「燃」的作品，自身 Design +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.workTypeCount', skill: 'design', workType: '燃', amountPerWork: 1 }],
  },
]);
