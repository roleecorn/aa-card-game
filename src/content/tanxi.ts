import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const tanxiCharacter = characterDefinitionSchema.parse({
  id: 'tanxi',
  name: '嘆息',
  stats: { design: 1, text: 0, aa: 0 },
  maxStress: 3,
  affinities: ['情'],
  skillIds: ['tanxiHardPush', 'tanxiHardToCoordinate'],
  tags: ['solo-creator', 'stress-driven'],
  portrait: '/assets/characters/portrait/tanxi.webp',
  compactPortrait: '/assets/characters/compact/tanxi.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-05 11:30:10：本人主動向 PintBox 詢問角色卡；PintBox 回覆目前只能給較低能力值。',
    '2026-09-05 11:32:10：PintBox 明確給出 Design 1、壓力上限 3，並表示目前能想到的技能偏負面。',
    '2026-09-10 角色校正：Text 與 AA 定為 0。',
    '本人表示「幾乎都是硬憋的作品分高一點，比較用心的就比較低」，因此「硬憋」設計為 source-driven Prototype skill。',
    'PintBox 後續把嘆息與鬼影並列為較難和其他人配合的類型；「難以配合」以每回合一次的負面壓力觸發表現。',
  ],
});

export const tanxiSkills = skillDefinitionSchema.array().parse([
  {
    id: 'tanxiHardPush',
    name: '硬憋',
    description: '每回合一次：自身壓力 +1，額外取得 1 顆 Text 骰；該骰擲 2 次並保留較高結果。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [
      { kind: 'stress.change', target: 'owner', amount: 1, source: '硬憋' },
      { kind: 'dice.grantBestOf', target: 'owner', skill: 'text', rolls: 2, count: 1, origin: '硬憋' },
    ],
    tags: ['prototype', 'stress-tradeoff'],
  },
  {
    id: 'tanxiHardToCoordinate',
    name: '難以配合',
    description: '每回合第一次其他我方角色放置骰子後，自身壓力 +1。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'afterDiePlaced',
      usage: { scope: 'round', limit: 1, key: 'hardToCoordinate' },
      condition: { kind: 'relation', field: 'actorId', relation: 'otherAlly' },
      effects: [{ kind: 'stress.change', target: 'owner', amount: 1, source: '難以配合' }],
    }],
    tags: ['negative', 'prototype'],
  },
]);
