import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const shennauCharacter = characterDefinitionSchema.parse({
  id: 'shennau',
  name: '神惱',
  stats: { design: 1, text: 1, aa: 0 },
  maxStress: 2,
  affinities: ['謀'],
  skillIds: ['shennauSettingManiac', 'shennauDoItMyself'],
  portrait: 'assets/characters/portrait/shennau.webp',
  compactPortrait: 'assets/characters/compact/shennau.webp',
  sourceNotes: [
    '2026-09-10：卡奧斯提出神惱卡；PintBox 明確認可原案。',
    '2026-09-11：卡奧斯提出神惱適性（謀），PintBox 以👌認可。',
    '2026-09-13：PintBox 確認維持「仍可被指定，但外部效果不生效」的現行語意。',
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
    activeTarget: { kind: 'pendingDie', relation: 'self', skill: 'text' },
    activeEffects: [{ kind: 'custom', handler: 'tradeSelectedOwnerTextForDesign' }],
  },
  {
    id: 'shennauDoItMyself',
    name: '自己做',
    description: '仍可被指定；其他角色技能或卡牌造成的正面、負面修正對自己無效。',
    activation: 'triggered',
    status: 'implemented',
    passives: [{ kind: 'effect.immunity', source: 'external' }],
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
