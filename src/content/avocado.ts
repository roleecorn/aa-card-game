import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const avocadoCharacter = characterDefinitionSchema.parse({
  id: 'avocado',
  name: '酪梨',
  stats: { design: 1, text: 1, aa: 1 },
  maxStress: 5,
  affinities: [],
  skillIds: ['avocadoManual'],
  tags: ['technical', 'triangle-creature'],
  portrait: 'assets/characters/portrait/avocado.webp',
  compactPortrait: 'assets/characters/compact/avocado.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-05 05:12:21：PintBox 明確提到「酪梨不是有發使用說明嗎，跟著用應該就行」。',
    '2026-09-05 05:17:35：PintBox 表示若自己當組長，會先把酪梨的 code 實際跑一次，理解其能力邊界。',
    '2026-09-03 06:10:34：本人整理自己的「使用說明書」，明確劃分技術人員職責、會議、留存與可追溯流程。',
    '2026-09-05 05:20–05:26：本人反覆談到修改困難、AI 把修改洗回去、功能雖能做但會衍生很多 bug，呈現強烈的 implementation-boundary 意識。',
    '基礎數值採 PintBox 2026-09-05 12:04:02 所述標準白板：Design / Text / AA 各 1、壓力上限 5，屬 Prototype assumption。',
    '「使用說明」runtime：遊戲開始時額外取得一張「指導」，代表把技術能力與限制整理成其他人可以直接使用的說明。',
    'dataset(1).zip 中「【G組有獎徵稿中】酪梨控【】」共 1101 則訊息。',
  ],
});

export const avocadoSkills = skillDefinitionSchema.array().parse([
  {
    id: 'avocadoManual',
    name: '使用說明',
    description: '遊戲開始時額外取得一張「指導」。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'gameStart', effects: [{ kind: 'cards.add', cardId: 'guide', count: 1 }] }],
  },
]);
