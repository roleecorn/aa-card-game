import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const meteorCharacter = characterDefinitionSchema.parse({
  id: 'meteor', name: '流星', stats: { design: 0, text: 1, aa: 2 }, maxStress: 4,
  affinities: ['燃'], skillIds: ['meteorBurnDesign', 'meteorResonance', 'viceLeaderPower'],
  portrait: 'assets/characters/portrait/meteor.webp', compactPortrait: 'assets/characters/compact/meteor.webp',
  sourceNotes: ['2026-09-12 PintBox 新版覆蓋舊版：燃作品 Design +1；每回合一次可重擲自身一顆骰；保留副組長力。'],
});
export const meteorSkills = skillDefinitionSchema.array().parse([
  { id: 'meteorBurnDesign', name: '軌言軌語', description: '自己的作品為（燃）時，本回合 Design +1。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', condition: { kind: 'workType', target: 'ownerWork', types: ['燃'] }, effects: [{ kind: 'stat.change', target: 'owner', skill: 'design', amount: 1, duration: 'round' }] }] },
  { id: 'meteorResonance', name: '軌之共鳴', description: '自己的作品為（燃）時，每回合一次，重擲自身一顆 pending die。', activation: 'active', status: 'implemented', activeUsage: { scope: 'round', limit: 1 }, activeTarget: { kind: 'pendingDie', relation: 'self' }, activeEffects: [{ kind: 'custom', handler: 'rerollSelectedOwnerDieIfWorkType', args: { workType: '燃' } }] },
]);
