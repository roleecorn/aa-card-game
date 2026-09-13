import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const tanxiCharacter = characterDefinitionSchema.parse({
  id: 'tanxi', name: '嘆息', stats: { design: 1, text: 1, aa: 1 }, maxStress: 3, affinities: ['情'],
  skillIds: ['tanxiImmatureWriting', 'tanxiThinkHard'], portrait: 'assets/characters/portrait/tanxi.webp', compactPortrait: 'assets/characters/compact/tanxi.webp',
  sourceNotes: ['2026-09-12 PintBox：Design/Text/AA 1/1/1，壓力3，適性（情）；Text 與 AA 不會骰出 5、6；每回合一次 +1 壓力把自身一顆骰 +2。'],
});
export const tanxiSkills = skillDefinitionSchema.array().parse([
  { id: 'tanxiImmatureWriting', name: '不成熟的文字', description: '自身 Text 與 AA 骰不會骰出 5、6。', activation: 'triggered', status: 'implemented', tags: ['roll-ban:5,6:text,aa'], triggers: [
    { event: 'afterRollBatch', priority: 200, condition: { kind: 'relation', field: 'actorId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'normalizeForbiddenEventDice', args: { values: [5, 6], skills: ['text', 'aa'] } }] },
    { event: 'afterDiceGranted', priority: 200, condition: { kind: 'relation', field: 'targetId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'normalizeForbiddenEventDice', args: { values: [5, 6], skills: ['text', 'aa'] } }] },
  ] },
  { id: 'tanxiThinkHard', name: '竭力思考', description: '每回合一次：自身壓力 +1，將自身一顆 pending die +2（最高 6）。', activation: 'active', status: 'implemented', activeUsage: { scope: 'round', limit: 1 }, activeTarget: { kind: 'pendingDie', relation: 'self' }, activeEffects: [{ kind: 'stress.change', target: 'owner', amount: 1, source: '竭力思考' }, { kind: 'dice.modifySelected', add: 2 }] },
]);
