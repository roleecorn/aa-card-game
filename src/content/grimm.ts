import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const grimmCharacter = characterDefinitionSchema.parse({
  id: 'grimm',
  name: '格林',
  stats: { design: 1, text: 2, aa: 3 },
  maxStress: 4,
  affinities: ['情', '燃', '笑'],
  skillIds: ['grimmBurningFrame'],
  tags: ['leader', 'visual-storyteller'],
  portrait: 'assets/characters/portrait/grimm.webp',
  compactPortrait: 'assets/characters/compact/grimm.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-01 23:40:56：PintBox 將格林描述為「長板很突出但有召喚代價」的類型。',
    '2026-09-05 11:09:30–11:12:42：PintBox 將格林與 79 並列為燃燒自己產出好作品的類型，並明確設計格林版為「自身 +1 壓力，給一顆 AA 骰 +2 數值」。',
    '2026-09-10 角色校正：AA 定為 3、壓力上限定為 4，作品適性定案為（情）（燃）（笑）。',
    '外觀未由 source 明確定義；runtime art 的人物外觀屬 Prototype art direction，僅以分鏡、童話與高投入畫面創作作為視覺依據。',
  ],
});

export const grimmSkills = skillDefinitionSchema.array().parse([
  {
    id: 'grimmBurningFrame',
    name: '燃燒畫面',
    description: '選擇自己一顆尚未分配的 AA 骰：自身壓力 +1，該骰 +2（最高 6）。可重複使用；壓力爆表仍依共通規則處理。',
    activation: 'active',
    status: 'implemented',
    activeTarget: { kind: 'pendingDie', relation: 'self', skill: 'aa', maxValue: 5 },
    activeEffects: [
      { kind: 'stress.change', target: 'owner', amount: 1, source: '燃燒畫面' },
      { kind: 'dice.modifySelected', add: 2 },
    ],
    tags: ['stress-tradeoff', 'aa'],
  },
]);
