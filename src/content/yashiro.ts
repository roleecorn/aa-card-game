import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const yashiroCharacter = characterDefinitionSchema.parse({
  id: 'yashiro',
  name: '八代',
  stats: { design: 1, text: 1, aa: 3 },
  maxStress: 5,
  affinities: ['情'],
  skillIds: ['yashiroQuickLearner', 'yashiroDeepResearch'],
  tags: ['triangle-creature'],
  portrait: 'assets/characters/portrait/yashiro.webp',
  compactPortrait: 'assets/characters/compact/yashiro.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-02 07:05:59：PintBox 卡面片段明確列 AA 3、壓力上限 5，以及「可愛又好學：回合開始時壓力最大的組員壓力 -1」。',
    '2026-09-03 07:57:17：PintBox 再次描述八代每回合減全組壓力是隊伍撐到最後的重要來源。',
    'Design / Text 未在卡面片段列出；依 PintBox 2026-09-05 12:04:02 定義的標準白板採 1 / 1。',
    '2026-09-04 03:35–03:37：PintBox 明確表示八代找資料的深度遠超預期，甚至追到紀念網站；本人也表示自己很認真又開心地參加組活。',
    '「查到比預期更深」為 source-driven prototype skill：每回合一次額外取得 1 顆最低為 3 的 Text 骰，表現深入查證而非單純提高常駐能力。',
    'dataset(1).zip 中「三角便當盒的八代」共 1170 則訊息。',
    '2026-09-10 角色校正：作品適性定案為僅（情）。',
  ],
});

export const yashiroSkills = skillDefinitionSchema.array().parse([
  {
    id: 'yashiroQuickLearner',
    name: '可愛又好學',
    description: '每回合開始時，壓力最高的我方組員壓力 -1。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'roundStart', effects: [{ kind: 'stress.change', target: 'highestStressAlly', amount: -1, source: '可愛又好學' }] }],
  },
  {
    id: 'yashiroDeepResearch',
    name: '查到比預期更深',
    description: '每回合一次，額外取得 1 顆 Text 骰；這顆骰最低為 3。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [{ kind: 'dice.grant', target: 'owner', skill: 'text', count: 1, minRoll: 3, origin: '查到比預期更深', extra: true }],
  },
]);
