import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
import { GAMEPLAY_STATUS } from '../game/statuses';

export const weakzhiCharacter = characterDefinitionSchema.parse({
  id: 'weakzhi',
  name: '弱智',
  stats: { design: 1, text: 1, aa: 1 },
  maxStress: 5,
  affinities: ['笑'],
  skillIds: ['weakzhiFinalRush', 'weakzhiRestrictions'],
  portrait: 'assets/characters/portrait/weakzhi.webp',
  compactPortrait: 'assets/characters/compact/weakzhi.webp',
  sourceNotes: [
    '2026-09-10 18:06:44（UTC+8）：PintBox 直接定義 Text 1 / Design 1 / AA 1 / Stress 5、適性（笑）、不能行動、不能成為統籌卡目標，並在結算前以 1d6 填充所有剩餘進度。',
    '2026-09-10 18:27:00（UTC+8）：PintBox 以「15d6」澄清五格作品的 15 個 Design / Text / AA 空位各自獨立擲 1d6，而不是共用同一個骰值。',
    '2026-09-10 18:28:07–18:28:55（UTC+8）：PintBox 補充並確認弱智即使擔任組長也不能使用統籌卡。',
  ],
});

export const weakzhiSkills = skillDefinitionSchema.array().parse([
  {
    id: 'weakzhiFinalRush',
    name: '最後三天趕稿',
    description: '最終結算前，自己的作品每個仍空著的 Design / Text / AA 進度格各自擲 1d6 並填入。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'roundEnd',
        condition: { kind: 'round', op: 'eq', value: 5 },
        effects: [{ kind: 'custom', handler: 'fillOwnerWorkRemainingRandom' }],
      },
    ],
  },
  {
    id: 'weakzhiRestrictions',
    name: '行動限制',
    description: '不能行動、不能成為統籌卡目標；若擔任組長，隊伍不能使用統籌卡。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'gameStart',
        effects: [
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.actionBlocked,
            stacks: 1,
            stacking: 'replace',
          },
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.coordinationUntargetable,
            stacks: 1,
            stacking: 'replace',
          },
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.coordinationDisabledAsLeader,
            stacks: 1,
            stacking: 'replace',
          },
        ],
      },
    ],
  },
]);
