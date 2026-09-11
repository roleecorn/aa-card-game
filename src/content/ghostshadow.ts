import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const ghostshadowCharacter = characterDefinitionSchema.parse({
  id: 'ghostshadow',
  name: '鬼影',
  stats: { design: 0, text: 2, aa: 0 },
  maxStress: 2,
  affinities: ['笑'],
  skillIds: ['ghostLoosePunchlines', 'ghostHardToCoordinate'],
  tags: ['gag-writer', 'solo-creator'],
  portrait: 'assets/characters/portrait/ghostshadow.webp',
  compactPortrait: 'assets/characters/compact/ghostshadow.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-05 11:42:37：PintBox 直接評估鬼影為「布置下任務後鑽回去掏出東西」的類型，明確給出 Text 2、壓力上限 2。',
    '同一段 PintBox 將鬼影與嘆息並列為較難和其他人配合、會帶負面技能的類型。',
    '2026-09-05 11:44:20–11:44:57：PintBox 表示鬼影主要在寫鬆散段子，而且很好笑；Design 以去年組活觀感而言「不太像正常東西」。',
    'Design 0 為依上述 Design 評語與專案對能力 0 的 prototype 慣例做出的 Prototype assumption。',
    '2026-09-10 角色校正：AA 定為 0。',
    '作品適性（笑）與技能「鬆散段子」為 source-driven Prototype design；不宣稱為 PintBox 原始卡面定案。',
  ],
});

export const ghostshadowSkills = skillDefinitionSchema.array().parse([
  {
    id: 'ghostLoosePunchlines',
    name: '鬆散段子',
    description: '每回合一次：自己的作品篇幅 +1，並額外取得 2 顆 Text 骰。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [
      { kind: 'work.length', target: 'ownerWork', amount: 1 },
      { kind: 'dice.grant', target: 'owner', skill: 'text', count: 2, origin: '鬆散段子', extra: true },
    ],
    tags: ['prototype', 'text'],
  },
  {
    id: 'ghostHardToCoordinate',
    name: '各寫各的',
    description: '每回合第一次其他我方角色放置骰子後，自身壓力 +1。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'afterDiePlaced',
      usage: { scope: 'round', limit: 1, key: 'ghostHardToCoordinate' },
      condition: { kind: 'relation', field: 'actorId', relation: 'otherAlly' },
      effects: [{ kind: 'stress.change', target: 'owner', amount: 1, source: '各寫各的' }],
    }],
    tags: ['negative', 'prototype'],
  },
]);
