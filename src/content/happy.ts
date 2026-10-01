import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const happyCharacter = characterDefinitionSchema.parse({
  id: 'happy',
  name: '高興',
  stats: { design: 3, text: 0, aa: 1 },
  maxStress: null,
  affinities: ['怪'],
  skillIds: ['happyContagion', 'happyEditor'],
  portrait: 'assets/characters/portrait/happy.webp',
  compactPortrait: 'assets/characters/compact/happy.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-14 final：Design 3 / Text 0 / AA 1，Stress 無上限，適性（怪）。',
    '「高興素」改為遊戲開始時讓所有組員作品額外獲得（怪），是 add type 而非 replace。',
    '舊版「高興放骰後把該作品改成怪」已被覆蓋。',
    '「編輯長」維持遊戲開始時額外取得 3 張統籌卡。',
  ],
});

export const happySkills = skillDefinitionSchema.array().parse([
  {
    id: 'happyContagion',
    name: '高興素',
    description: '遊戲開始時，我方所有組員的作品額外獲得「怪」類型，不覆蓋原本類型。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'gameStart', effects: [{ kind: 'work.type.add', target: 'allAllyWorks', workType: '怪' }] }],
  },
  {
    id: 'happyEditor',
    name: '編輯長',
    description: '遊戲開始時額外取得三張統籌卡。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'gameStart',
      effects: [{ kind: 'custom', handler: 'addRandomCardsByKind', args: { cardKind: 'coordination', count: 3 } }],
    }],
  },
]);
