import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const patrickCharacter = characterDefinitionSchema.parse({
  id: 'patrick', name: '派大星', stats: { design: 0, text: 0, aa: 1 }, maxStress: 3, affinities: ['謀'],
  skillIds: ['patrickHelp'], portrait: 'assets/characters/portrait/patrick.webp', compactPortrait: 'assets/characters/compact/patrick.webp',
  sourceNotes: ['2026-09-12 PintBox：適性（謀）；派式求救每回合一次，組長壓力 +1，獲得 2 張「指導」。'],
});
export const patrickSkills = skillDefinitionSchema.array().parse([
  { id: 'patrickHelp', name: '派式求救', description: '每回合一次：組長壓力 +1，獲得 2 張「指導」。', activation: 'active', status: 'implemented', activeUsage: { scope: 'round', limit: 1 }, activeTarget: { kind: 'none' }, activeEffects: [{ kind: 'stress.change', target: 'teamLeader', amount: 1, source: '派式求救' }, { kind: 'cards.add', cardId: 'guide', count: 2 }] },
]);
