import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const yamadaCharacter = characterDefinitionSchema.parse({
  id: 'yamada',
  name: '山田',
  stats: { design: 0, text: 0, aa: 2 },
  maxStress: 2,
  affinities: [],
  skillIds: ['yamadaSignalJump', 'yamadaVanish'],
  portrait: 'assets/characters/portrait/yamada.webp',
  compactPortrait: 'assets/characters/compact/yamada.webp',
  sourceNotes: [
    '2026-09-10：卡奧斯提出山田卡；PintBox 明確修訂為 Text 0 / Design 0 / AA 2、Stress 2。',
    'PintBox 確認「電波跳躍」：第一回合各擲 3 顆 Text / Design 骰，只有 5、6 可以保留。',
    'PintBox 修訂「神隱」：Stress 達到上限時直接離場，無法繼續參與遊戲。',
    '討論沒有明確定義作品適性，因此不自行補適性。',
  ],
});

export const yamadaSkills = skillDefinitionSchema.array().parse([
  {
    id: 'yamadaSignalJump',
    name: '電波跳躍',
    description: '第一回合開始時，各擲 3 顆 Text / Design 骰；只有 5、6 可以保留。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'roundStart',
        condition: { kind: 'round', op: 'eq', value: 1 },
        effects: [
          {
            kind: 'custom',
            handler: 'rollOwnerDiceAndKeepAtLeast',
            args: { designCount: 3, textCount: 3, minValue: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'yamadaVanish',
    name: '神隱',
    description: '自己的 Stress 達到上限時直接離場，之後無法繼續參與遊戲。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'afterExternalStress',
        priority: -100,
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'targetId', relation: 'self' },
            { kind: 'ownerStress', op: 'gte', value: 2 },
          ],
        },
        effects: [{ kind: 'custom', handler: 'departOwner' }],
      },
      {
        event: 'afterRollBatch',
        priority: -100,
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'actorId', relation: 'self' },
            { kind: 'sourceKind', value: 'work' },
          ],
        },
        effects: [{ kind: 'custom', handler: 'departOwnerIfWorkWouldReachStressCap' }],
      },
    ],
  },
]);
