import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const mashiroCharacter = characterDefinitionSchema.parse({
  id: 'mashiro',
  name: '真白',
  stats: { design: 2, text: 1, aa: 2 },
  maxStress: 5,
  affinities: [],
  skillIds: ['mashiroAffinity', 'mashiroSynthesis'],
  portrait: 'assets/characters/portrait/mashiro.webp',
  compactPortrait: 'assets/characters/compact/mashiro.webp',
  sourceNotes: [
    '2026-09-03 07:56:48：Text 1、Design 2、AA 2、壓力上限 5。',
    '討論明確指定全作品適性。',
  ],
});

export const mashiroSkills = skillDefinitionSchema.array().parse([
  {
    id: 'mashiroAffinity',
    name: '對待工作的態度',
    description: '視為擁有全部作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'mashiroSynthesis',
    name: '融會貫通',
    description: '每回合一次，可把自己一顆骰改成另一組員的一顆骰值。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeHint: '選擇另一名組員的骰作為來源，再選真白自己的骰作為目標。',
    activeTarget: { kind: 'copyPendingDie', source: 'otherAlly', target: 'self' },
    activeEffects: [{ kind: 'dice.copySelectedValue', source: 'selectedSourceDie', target: 'selectedTargetDie' }],
  },
]);
