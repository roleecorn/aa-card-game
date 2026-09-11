import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const pigeonCharacter = characterDefinitionSchema.parse({
  id: 'pigeon',
  name: '鴿子的化身',
  stats: { design: 1, text: 2, aa: 1 },
  maxStress: 3,
  affinities: ['燃', '謀', '笑', '情', '怪'],
  skillIds: ['pigeonReaderPerspective'],
  tags: ['editorial', 'reader-perspective'],
  portrait: '/assets/characters/portrait/pigeon.webp',
  compactPortrait: '/assets/characters/compact/pigeon.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-05 11:22:13：PintBox 直接回覆鴿子的卡面基礎為 Text 2 / Design 1 / AA 1 / Stress 4。',
    '2026-09-05 11:25:52–11:29:17：PintBox 再確認「鴿子只有壓力 3 嗎」並暫定 3，因此以後續值 Stress 3 為準。',
    'PintBox 同時明確表示技能觀測資料不足；「讀者視角」因此標為 source-driven Prototype skill，不冒充原始 PintBox 技能。',
    '2026-09-10 角色校正：作品適性定案為全適性。',
  ],
});

export const pigeonSkills = skillDefinitionSchema.array().parse([
  {
    id: 'pigeonReaderPerspective',
    name: '讀者視角',
    description: '每回合一次，選擇另一名我方角色一顆尚未分配的骰，使其 +1（最高 6）。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'pendingDie', relation: 'otherAlly' },
    activeEffects: [{ kind: 'dice.modifySelected', add: 1 }],
    tags: ['support', 'prototype'],
  },
]);
