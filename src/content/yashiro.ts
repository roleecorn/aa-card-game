import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const yashiroCharacter = characterDefinitionSchema.parse({
  id: 'yashiro', name: '八代', stats: { design: 0, text: 0, aa: 3 }, maxStress: 5, affinities: ['情', '怪'],
  skillIds: ['yashiroCute', 'yashiroStudious'], tags: ['triangle-creature'], portrait: 'assets/characters/portrait/yashiro.webp', compactPortrait: 'assets/characters/compact/yashiro.webp',
  sourceNotes: ['2026-09-12 PintBox 新版：適性（情）（怪）；可愛：回合開始壓力最高組員 -1；好學：回合開始獲得 2 張指導。'],
});
export const yashiroSkills = skillDefinitionSchema.array().parse([
  { id: 'yashiroCute', name: '可愛', description: '回合開始時，己方壓力最高的組員壓力 -1。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', effects: [{ kind: 'stress.change', target: 'highestStressAlly', amount: -1, source: '可愛' }] }] },
  { id: 'yashiroStudious', name: '好學', description: '回合開始時獲得 2 張「指導」。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', effects: [{ kind: 'cards.add', cardId: 'guide', count: 2 }] }] },
]);
