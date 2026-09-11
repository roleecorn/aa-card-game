import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const happyCharacter = characterDefinitionSchema.parse({
  id: 'happy',
  name: '高興',
  stats: { design: 3, text: 0, aa: 0 },
  maxStress: null,
  affinities: ['怪'],
  skillIds: ['happyContagion', 'happyEditor'],
  portrait: '/assets/characters/portrait/happy.webp',
  compactPortrait: '/assets/characters/compact/happy.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '原始角色卡明確列出 Design 3、壓力上限 ∞。',
    'Text / AA 未在角色卡中列出；依目前 prototype 對未列能力的資料慣例採 0。',
    '技能「高興」：參與的作品類型變為（怪）。',
    '第二技能採後期修正版：遊戲開始時額外取得三張統籌卡。',
    '2026-09-10 角色校正：作品適性定案為僅（怪）。',
  ],
});

export const happySkills = skillDefinitionSchema.array().parse([
  {
    id: 'happyContagion',
    name: '高興',
    description: '高興將自己的骰放入作品後，該作品類型變為「怪」。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'afterDiePlaced',
      condition: { kind: 'relation', field: 'actorId', relation: 'self' },
      effects: [{ kind: 'work.type', target: 'eventWork', workType: '怪' }],
    }],
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
