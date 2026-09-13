import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const ingridCharacter = characterDefinitionSchema.parse({ id: 'ingrid', name: 'Ingrid', stats: { design: 2, text: 2, aa: 1 }, maxStress: 4, affinities: ['謀', '情'], skillIds: ['ingridMercuryRetrograde', 'ingridArchitecture'], portrait: 'assets/characters/portrait/narrator.webp', compactPortrait: 'assets/characters/compact/narrator.webp', sourceNotes: ['2026-09-12 PintBox：Design2/Text2/AA1，壓力4，適性（謀）（情）；第3回合神隱；第一回合額外得到6/3/1三顆Design。'] });
export const ingridSkills = skillDefinitionSchema.array().parse([
  { id: 'ingridMercuryRetrograde', name: '水逆工作狂', description: '第 3 回合神隱 1 輪。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', condition: { kind: 'round', op: 'eq', value: 3 }, effects: [{ kind: 'custom', handler: 'hideOwner', args: { rounds: 1 } }] }] },
  { id: 'ingridArchitecture', name: '過於精巧的架構', description: '第一回合開始時，額外獲得點數 6、3、1 的三顆 Design 骰。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'gameStart', effects: [{ kind: 'custom', handler: 'grantOwnerFixedDice', args: { skill: 'design', values: [6, 3, 1] } }] }] },
]);
