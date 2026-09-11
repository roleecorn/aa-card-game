import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const akikageCharacter = characterDefinitionSchema.parse({
  id: 'akikage',
  name: '秋影',
  stats: { design: 1, text: 2, aa: 1 },
  maxStress: 3,
  affinities: [],
  skillIds: ['akikageDeadlineWarrior', 'akikageProcrastination'],
  portrait: 'assets/characters/portrait/akikage.webp',
  compactPortrait: 'assets/characters/compact/akikage.webp',
  sourceNotes: [
    '2026-09-10：卡奧斯提出 Text 2 / Design 1 / AA 1 / Stress 3，以及「死線戰士」「拖延症」；PintBox 後續重新確認此套規格。',
    '來源未定義作品適性，因此不自行補值。',
  ],
});

export const akikageSkills = skillDefinitionSchema.array().parse([
  {
    id: 'akikageDeadlineWarrior',
    name: '死線戰士',
    description: '遊戲開始時，自己的 Stress 為 3。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'gameStart',
        effects: [{ kind: 'stress.change', target: 'owner', amount: 3, source: '死線戰士' }],
      },
    ],
  },
  {
    id: 'akikageProcrastination',
    name: '拖延症',
    description: '自己擲出的 1、2 不能使用。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'afterRollBatch',
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'actorId', relation: 'self' },
            { kind: 'diceMatch', maxValue: 2 },
          ],
        },
        effects: [{ kind: 'custom', handler: 'removeEventDiceAtOrBelow', args: { maxValue: 2 } }],
      },
    ],
  },
]);
