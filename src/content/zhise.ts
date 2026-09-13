import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const zhiseCharacter = characterDefinitionSchema.parse({ id: 'zhise', name: '滯澀', stats: { design: 1, text: 1, aa: 1 }, maxStress: 5, affinities: ['謀'], skillIds: ['zhiseHidden', 'zhiseFinalFill'], portrait: 'assets/characters/portrait/zhise.webp', compactPortrait: 'assets/characters/compact/zhise.webp', sourceNotes: ['2026-09-12 PintBox：1/1/1，壓力5，適性（謀）；開局神隱5輪，結算以1d6填滿作品剩餘進度。'] });
export const zhiseSkills = skillDefinitionSchema.array().parse([
  { id: 'zhiseHidden', name: '神隱', description: '遊戲開始時神隱 5 輪。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'gameStart', effects: [{ kind: 'custom', handler: 'hideOwner', args: { rounds: 5 } }] }] },
  { id: 'zhiseFinalFill', name: '結算補完', description: '最終結算前，以獨立 1d6 填滿自己作品剩餘進度。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundEnd', condition: { kind: 'round', op: 'eq', value: 5 }, effects: [{ kind: 'custom', handler: 'fillOwnerWorkRemainingRandom' }] }] },
]);
