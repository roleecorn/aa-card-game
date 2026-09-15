import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const ghostshadowCharacter = characterDefinitionSchema.parse({
  id: 'ghostshadow', name: '鬼影', stats: { design: 1, text: 2, aa: 1 }, maxStress: 3, affinities: ['笑'],
  skillIds: ['ghostshadowImmatureDesign', 'ghostshadowCatResonance'], portrait: 'assets/characters/portrait/ghostshadow.webp', compactPortrait: 'assets/characters/compact/ghostshadow.webp',
  sourceNotes: ['2026-09-12 PintBox：Design/Text/AA 1/2/1，壓力3，適性（笑）；Design/AA 不會骰出5、6；貓影共鳴 +1壓力重擲作品所有Design，且此次不受限制。'],
});
export const ghostshadowSkills = skillDefinitionSchema.array().parse([
  { id: 'ghostshadowImmatureDesign', name: '不成熟的設計', description: '自身 Design 與 AA 骰不會骰出 5、6。', activation: 'triggered', status: 'implemented', tags: ['roll-ban:5,6:design,aa'], triggers: [
    { event: 'afterRollBatch', priority: 200, condition: { kind: 'relation', field: 'actorId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'normalizeForbiddenEventDice', args: { values: [5, 6], skills: ['design', 'aa'] } }] },
    { event: 'afterDiceGranted', priority: 200, condition: { kind: 'relation', field: 'targetId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'normalizeForbiddenEventDice', args: { values: [5, 6], skills: ['design', 'aa'] } }] },
  ] },
  { id: 'ghostshadowCatResonance', name: '貓影共鳴', description: '自身壓力 +1，重擲自己作品中所有已填入的 Design；此次重擲不受「不成熟的設計」限制。', activation: 'active', status: 'implemented', activeTarget: { kind: 'none' }, activeCondition: { kind: 'workHasProgress', target: 'ownerWork', skill: 'design' }, activeEffects: [{ kind: 'stress.change', target: 'owner', amount: 1, source: '貓影共鳴' }, { kind: 'custom', handler: 'rerollOwnerWorkProgress', args: { skill: 'design', ignoreRollRestrictions: true } }] },
]);
