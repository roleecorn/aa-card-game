import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const fengyangCharacter = characterDefinitionSchema.parse({
  id: 'fengyang', name: '風揚', stats: { design: 3, text: 3, aa: 0 }, maxStress: 2, affinities: ['謀', '情'],
  skillIds: ['commercialAuthor', 'fengyangWakeUp'], tags: ['commercial-author'], portrait: 'assets/characters/portrait/fengyang.webp', compactPortrait: 'assets/characters/compact/fengyang.webp', portraitPosition: { x: 50, y: 12 },
  sourceNotes: ['2026-09-12 PintBox 定案：商業作者維持最低骰面3；「起來」在回合開始且壓力>=上限時，自身-1、組長+1；若自己是組長則互相抵消。'],
});
export const fengyangSkills = skillDefinitionSchema.array().parse([
  { id: 'commercialAuthor', name: '商業作者', description: '不會擲出 3 以下；所有擲骰結果最低視為 3。', activation: 'passive', status: 'implemented', passives: [{ kind: 'roll.floor', value: 3 }] },
  { id: 'fengyangWakeUp', name: '起來', description: '回合開始時，若自身壓力 >= 上限：自身壓力 -1、組長壓力 +1；若自身就是組長，效果抵消。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', effects: [{ kind: 'custom', handler: 'fengyangWakeUp' }] }] },
]);
