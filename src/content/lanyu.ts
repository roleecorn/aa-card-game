import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const lanyuCharacter = characterDefinitionSchema.parse({
  id: 'lanyu', name: '嵐羽', stats: { design: 1, text: 1, aa: 1 }, maxStress: 3, affinities: ['情'],
  skillIds: ['lanyuCommunication', 'lanyuTechnicalReserve'], portrait: 'assets/characters/portrait/lanyu.webp', compactPortrait: 'assets/characters/compact/lanyu.webp',
  sourceNotes: ['2026-09-10：PintBox認可卡奧斯提出的角色原案。', '2026-09-11：卡奧斯提出嵐羽適性（情），PintBox以👌認可。'],
});
export const lanyuSkills = skillDefinitionSchema.array().parse([
  { id: 'lanyuCommunication', name: '好溝通', description: '作為組員時，若 Leader 的工作骰中至少有一顆 Design >=4，自己額外擲 1 顆 Design 骰。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'afterRollBatch', condition: { kind: 'sourceKind', value: 'work' }, effects: [{ kind: 'custom', handler: 'grantOwnerDesignIfActorLeaderDesignAtLeast', args: { minValue: 4 } }] }] },
  { id: 'lanyuTechnicalReserve', name: '技術底力', description: '每回合一次：自己 +1 Stress，額外擲 1 顆 AA 骰。', activation: 'active', status: 'implemented', activeUsage: { scope: 'round', limit: 1 }, activeTarget: { kind: 'none' }, activeEffects: [{ kind: 'stress.change', target: 'owner', amount: 1, source: '技術底力' }, { kind: 'dice.grant', target: 'owner', skill: 'aa', count: 1, origin: '技術底力', extra: true }] },
]);
