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
    '2026-09-14 final：Design 1 / Text 2 / AA 3，適性（燃）；既有 Stress 上限 3 維持。',
    '「起來」：回合開始且自身 Stress >= effective maxStress 時，自身 -1、組長 +1。',
    '「愉悅的支援者」：每回合一次，消耗自己一顆 pending die，把另一名組員一顆 pending die 改為同點數，自身 Stress -1。',
  ],
});

export const ginsakuraSkills = skillDefinitionSchema.array().parse([
  {
    id: 'ginsakuraRise',
    name: '起來',
    description: '回合開始時，若自身 Stress >= 壓力上限：自身 Stress -1、組長 Stress +1；自己就是組長時兩者抵消。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'roundStart', effects: [{ kind: 'custom', handler: 'fengyangWakeUp' }] }],
  },
  {
    id: 'ginsakuraSupport',
    name: '愉悅的支援者',
    description: '每回合一次：消耗自己 1 顆 pending die，選另一名組員 1 顆 pending die，將其改為被消耗骰的點數，自身 Stress -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'copyPendingDie', source: 'self', target: 'otherAlly', requireValueChange: false },
    activeEffects: [{ kind: 'custom', handler: 'ginsakuraSupport' }],
  },
]);
