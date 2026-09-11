import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const shennauCharacter = characterDefinitionSchema.parse({
  id: 'shennau',
  name: '神惱',
  stats: { design: 1, text: 1, aa: 0 },
  maxStress: 2,
  affinities: [],
  skillIds: ['shennauSettingManiac', 'shennauDoItMyself'],
  portrait: 'assets/characters/portrait/shennau.webp',
  compactPortrait: 'assets/characters/compact/shennau.webp',
  sourceNotes: [
    '2026-09-10：卡奧斯提出神惱卡；PintBox 明確認可原案。',
    '設定狂：每回合一次，可以少 1 顆 Text 骰換取額外 1 顆 Design 骰。',
    '自己做：不能受到正面或負面的修正，包含技能、事件卡與統籌卡。',
    '討論沒有明確定義作品適性，因此不自行補適性。',
  ],
});

export const shennauSkills = skillDefinitionSchema.array().parse([
  {
    id: 'shennauSettingManiac',
    name: '設定狂',
    description: '每回合一次，選擇自己一顆尚未分配的 Text 骰；移除該骰，額外擲 1 顆 Design 骰。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeHint: '選擇神惱自己一顆尚未分配的 Text 骰。',
    activeTarget: { kind: 'pendingDie', relation: 'self' },
    activeEffects: [{ kind: 'custom', handler: 'tradeSelectedOwnerTextForDesign' }],
  },
  {
    id: 'shennauDoItMyself',
    name: '自己做',
    description: '不能受到其他角色技能或卡牌造成的正面、負面修正。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'beforeExternalStress',
        priority: 1000,
        condition: { kind: 'relation', field: 'targetId', relation: 'self' },
        effects: [{ kind: 'event.cancel' }],
      },
      {
        event: 'beforeDieModified',
        priority: 1000,
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'relation', field: 'targetId', relation: 'self' },
            { kind: 'not', condition: { kind: 'relation', field: 'actorId', relation: 'self' } },
          ],
        },
        effects: [{ kind: 'event.cancel' }],
      },
    ],
  },
]);
