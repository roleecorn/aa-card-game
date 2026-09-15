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
    '2026-09-05 11:09:30–11:12:42：PintBox 將格林與 79 並列為燃燒自己產出好作品的類型。',
    '2026-09-10 角色校正：AA 定為 3、壓力上限定為 4，作品適性定案為（情）（燃）（笑）。',
    '2026-09-11 04:50 PintBox 新版覆蓋舊版：作品為（情）時，每回合一次，可將作品中任一已放置骰改為 3，之後自身壓力 -1。',
    '外觀未由 source 明確定義；runtime art 的人物外觀屬 Prototype art direction，僅以分鏡、童話與高投入畫面創作作為視覺依據。',
  ],
});

export const grimmSkills = skillDefinitionSchema.array().parse([
  {
    id: 'grimmBurningFrame',
    name: '對托內利可的愛',
    description: '自己的作品為（情）時，每回合一次：選擇作品中任一已放置的 Design／Text／AA 骰，將其改為 3，然後自身壓力 -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeCondition: {
      kind: 'all',
      conditions: [
        { kind: 'workType', target: 'selectedWork', types: ['情'] },
        { kind: 'workHasProgress', target: 'selectedWork' },
      ],
    },
    activeHint: '先選擇自己的（情）作品，再選擇作品中一顆已放置的骰。',
    activeTarget: { kind: 'work', relation: 'owner' },
    activeEffects: [
      { kind: 'custom', handler: 'grimmLoveForTonelico' },
    ],
    tags: ['work-progress', 'stress-relief', '情'],
  },
]);
