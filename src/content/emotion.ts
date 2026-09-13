import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const emotionCharacter = characterDefinitionSchema.parse({
  id: 'emotion', name: '情緒', stats: { design: 1, text: 1, aa: 2 }, maxStress: 5, affinities: ['情'],
  skillIds: ['emotionSpinningTop'], portrait: 'assets/characters/portrait/emotion.webp', compactPortrait: 'assets/characters/compact/emotion.webp',
  sourceNotes: ['2026-09-12 PintBox：屬陀螺的——每回合第一次成為統籌卡目標時，組長壓力 -1。'],
});
export const emotionSkills = skillDefinitionSchema.array().parse([
  { id: 'emotionSpinningTop', name: '屬陀螺的', description: '每回合第一次成為統籌卡目標時，組長壓力 -1。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'cardPlayed', usage: { scope: 'round', limit: 1 }, condition: { kind: 'all', conditions: [{ kind: 'sourceKind', value: 'coordination' }, { kind: 'relation', field: 'targetId', relation: 'self' }] }, effects: [{ kind: 'stress.change', target: 'teamLeader', amount: -1, source: '屬陀螺的' }] }] },
]);
