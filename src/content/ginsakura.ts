import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const ginsakuraCharacter = characterDefinitionSchema.parse({
  id: 'ginsakura',
  name: '銀櫻',
  stats: { design: 1, text: 2, aa: 3 },
  maxStress: 3,
  affinities: ['燃'],
  skillIds: ['ginsakuraRise', 'ginsakuraSupport'],
  portrait: 'assets/characters/portrait/ginsakura.webp',
  compactPortrait: 'assets/characters/compact/ginsakura.webp',
  sourceNotes: [
    '2026-09-03 07:49:52：Text 2、Design 1、AA 3、壓力上限 3。',
    '2026-09-10 角色校正：作品適性定案為僅（燃）。',
  ],
});

export const ginsakuraSkills = skillDefinitionSchema.array().parse([
  {
    id: 'ginsakuraRise',
    name: '起來',
    description: '可以反制外部骰子效果；目前整理紀錄沒有完整觸發條件與數值。',
    activation: 'triggered',
    status: 'planned',
  },
  {
    id: 'ginsakuraSupport',
    name: '愉悅的支援者',
    description: '可以用自己的骰替換別人的骰，並使自己降低壓力；目前整理紀錄沒有完整替換限制與降壓數值。',
    activation: 'active',
    status: 'planned',
  },
]);
