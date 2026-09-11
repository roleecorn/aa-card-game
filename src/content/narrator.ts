import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const narratorCharacter = characterDefinitionSchema.parse({
  id: 'narrator',
  name: '旁白',
  stats: { design: 1, text: 3, aa: 1 },
  maxStress: 5,
  affinities: ['笑'],
  skillIds: ['narratorOsaka', 'narratorLongForm'],
  portrait: 'assets/characters/portrait/narrator.webp',
  compactPortrait: 'assets/characters/compact/narrator.webp',
  sourceNotes: [
    '2026-09-03 08:00:45：Text 3、Design 1、AA 1。',
    '壓力上限未在目前整理紀錄中明確列出；prototype 暫用 5。',
    '作品適性目前為 prototype 暫定。',
  ],
});

export const narratorSkills = skillDefinitionSchema.array().parse([
  {
    id: 'narratorOsaka',
    name: '中國大阪人',
    description: '可增加骰子，但會使參與的作品轉為（笑）。',
    activation: 'active',
    status: 'planned',
  },
  {
    id: 'narratorLongForm',
    name: '超長發揮',
    description: '超出篇幅的判定骰會增加作品長度。',
    activation: 'triggered',
    status: 'planned',
  },
]);
