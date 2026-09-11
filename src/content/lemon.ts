import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const lemonCharacter = characterDefinitionSchema.parse({
  id: 'lemon',
  name: '檸檬',
  stats: { design: 1, text: 1, aa: 1 },
  maxStress: 5,
  affinities: ['謀'],
  skillIds: ['lemonFireRescue'],
  tags: ['leader'],
  portrait: '/assets/characters/portrait/lemon.webp',
  compactPortrait: '/assets/characters/compact/lemon.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-05 05:50:27：PintBox 將檸檬與風揚並列為「比較嚴格的組長」。',
    '2026-09-02 07:35–07:38：檸檬評論作品時反覆強調整體脈絡、連貫性、即時溝通，以及問題出現時應先做預案。',
    '基礎數值採 PintBox 2026-09-05 12:04:02 所述標準白板：Design / Text / AA 各 1、壓力上限 5。',
    '2026-09-10 角色校正：作品適性定案為僅（謀）；技能改為「火場救援」：自身 +1 壓力，取得 3 顆救援骰供其他組員作品使用。',
    'dataset(1).zip 中「【自掛東南枝】檸檬」共 2425 則訊息。',
  ],
});

export const lemonSkills = skillDefinitionSchema.array().parse([
  {
    id: 'lemonStrictLeader',
    name: '嚴格的組長',
    description: '每回合第一次有我方角色工作骰出 1 或 2 時，重擲最低的一顆。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'afterRollBatch',
      priority: 10,
      usage: { scope: 'round', limit: 1, key: 'contingency' },
      condition: {
        kind: 'all',
        conditions: [
          { kind: 'relation', field: 'actorId', relation: 'ally' },
          { kind: 'diceMatch', maxValue: 2 },
        ],
      },
      effects: [{ kind: 'dice.rerollBatch', count: 1, maxValue: 2, lowestFirst: true }],
    }],
  },
  {
    id: 'lemonFireRescue',
    name: '火場救援',
    description: '每回合一次：自身壓力 +1，額外取得 3 顆救援骰（Design / Text / AA 各 1）；這些骰可投入任一我方組員的作品進度條。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [
      { kind: 'stress.change', target: 'owner', amount: 1, source: '火場救援' },
      { kind: 'dice.grant', target: 'owner', skill: 'design', count: 1, origin: '火場救援', extra: true },
      { kind: 'dice.grant', target: 'owner', skill: 'text', count: 1, origin: '火場救援', extra: true },
      { kind: 'dice.grant', target: 'owner', skill: 'aa', count: 1, origin: '火場救援', extra: true },
    ],
    tags: ['support', 'stress-tradeoff'],
  },
]);
