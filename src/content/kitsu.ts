import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const kitsuCharacter = characterDefinitionSchema.parse({
  id: 'kitsu',
  name: 'キツ',
  stats: { design: 1, text: 1, aa: 1 },
  maxStress: 5,
  affinities: ['笑', '怪'],
  skillIds: ['kitsuReplayThirty'],
  tags: ['qa', 'regression'],
  portrait: 'assets/characters/portrait/kitsu.webp',
  compactPortrait: 'assets/characters/compact/kitsu.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-02 10:20:29：本人明確表示「做完當天我大概重播了30次」。',
    '2026-09-02 11:08:24：本人抓到「緞刀的背景又回原樣了」，屬於明確 regression observation。',
    '2026-09-02 11:12:15：本人指出兩段內容其實有關聯，顯示除了表面錯誤外也會檢查前後脈絡。',
    '基礎數值採 PintBox 2026-09-05 12:04:02 所述標準白板：Design / Text / AA 各 1、壓力上限 5，屬 Prototype assumption。',
    '「重播三十次」runtime：每回合第一次自己工作骰出 1 時，自動重擲最低的一顆；用反覆驗證抓掉最明顯 regression。',
    'dataset(1).zip 中「キツ」共 1086 則訊息。',
    '2026-09-10 角色校正：橘對應 kitsu，作品適性定案為（笑）（怪）。',
  ],
});

export const kitsuSkills = skillDefinitionSchema.array().parse([
  {
    id: 'kitsuReplayThirty',
    name: '重播三十次',
    description: '每回合第一次自己工作骰出 1 時，自動重擲最低的一顆。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'afterRollBatch',
      priority: 15,
      usage: { scope: 'round', limit: 1, key: 'replayThirty' },
      condition: {
        kind: 'all',
        conditions: [
          { kind: 'relation', field: 'actorId', relation: 'self' },
          { kind: 'diceMatch', maxValue: 1 },
        ],
      },
      effects: [{ kind: 'dice.rerollBatch', count: 1, maxValue: 1, lowestFirst: true }],
    }],
  },
]);
