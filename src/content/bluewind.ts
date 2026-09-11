import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const bluewindCharacter = characterDefinitionSchema.parse({
  id: 'bluewind',
  name: '藍風',
  stats: { design: 1, text: 1, aa: 0 },
  maxStress: 3,
  affinities: ['情'],
  skillIds: ['bluewindDelusion', 'virtualCircle'],
  portrait: 'assets/characters/portrait/bluewind.webp',
  compactPortrait: 'assets/characters/compact/bluewind.webp',
  sourceNotes: [
    '2026-09-03 19:21:48：Text 1、Design 1、壓力上限 3。',
    'AA 未在目前整理紀錄中明確列出；prototype 暫用 0。',
    '2026-09-10 角色校正：作品適性定案為僅（情），並取得「虛之會圈」。',
  ],
});

export const bluewindSkills = skillDefinitionSchema.array().parse([
  {
    id: 'virtualCircle',
    name: '虛之會圈',
    description: '遊戲開始時額外取得兩張「語音會議」。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'gameStart', effects: [{ kind: 'cards.add', cardId: 'voice', count: 2 }] }],
  },
  {
    id: 'bluewindDelusion',
    name: '妄想全開',
    description: '擲 2 顆 Design 骰、作品篇幅 +1、自身壓力 -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    ai: { autoUse: true, when: 'ownerStressed' },
    activeEffects: [
      { kind: 'dice.grant', target: 'owner', skill: 'design', count: 2, origin: '妄想全開', extra: true },
      { kind: 'work.length', target: 'ownerWork', amount: 1 },
      { kind: 'stress.change', target: 'owner', amount: -1, source: '妄想全開' },
    ],
  },
]);
