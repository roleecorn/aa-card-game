import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const fengyangCharacter = characterDefinitionSchema.parse({
  id: 'fengyang',
  name: '風揚',
  stats: { design: 3, text: 3, aa: 0 },
  maxStress: 2,
  affinities: ['謀', '情'],
  skillIds: ['commercialAuthor'],
  tags: ['commercial-author'],
  portrait: 'assets/characters/portrait/fengyang.webp',
  compactPortrait: 'assets/characters/compact/fengyang.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-03 07:29:20：Text 3、Design 3、壓力上限 2。',
    'AA 未在目前整理紀錄中明確列出；依 prototype 未列能力的資料慣例採 0。',
    '技能「商業作者」明確為不會擲出 3 以下，因此 runtime roll floor = 3。',
    '作品適性目前為 prototype 暫定。',
  ],
});

export const fengyangSkills = skillDefinitionSchema.array().parse([
  {
    id: 'commercialAuthor',
    name: '商業作者',
    description: '不會擲出 3 以下；所有擲骰結果最低視為 3（不會出現 1 或 2）。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'roll.floor', value: 3 }],
  },
]);
