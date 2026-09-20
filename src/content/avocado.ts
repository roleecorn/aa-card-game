import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const avocadoCharacter = characterDefinitionSchema.parse({
  id: 'avocado',
  name: '酪梨',
  stats: { design: 2, text: 1, aa: 0 },
  maxStress: 3,
  affinities: ['謀'],
  skillIds: ['avocadoGameTech', 'avocadoNeedsManual'],
  tags: ['technical', 'triangle-creature'],
  portrait: 'assets/characters/portrait/avocado.webp',
  compactPortrait: 'assets/characters/compact/avocado.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-14 final：Design 2 / Text 1 / AA 0，Stress 3，適性（謀）。',
    '「遊戲技術力」：Stress 未滿時可不限次把我方所有 Design pending dice 轉成同點數 AA dice。',
    '「需要使用說明」：我方統籌卡指定其他角色時自身 Stress +1；作品目標與全員型統籌卡不觸發。',
    '舊版遊戲開始額外取得「指導」已被覆蓋。',
  ],
});

export const avocadoSkills = skillDefinitionSchema.array().parse([
  {
    id: 'avocadoGameTech',
    name: '遊戲技術力',
    description: '只要自身 Stress 未滿，可不限次把我方所有 Design pending dice 轉為同點數的 AA dice。',
    activation: 'active',
    status: 'implemented',
    activeTarget: { kind: 'none' },
    activeCondition: {
      kind: 'all',
      conditions: [
        { kind: 'ownerStressBelowCap' },
        { kind: 'pendingDice', target: 'allAllies', skill: 'design', countAtLeast: 1 },
      ],
    },
    activeEffects: [{ kind: 'dice.convertPending', target: 'allAllies', fromSkill: 'design', toSkill: 'aa' }],
  },
  {
    id: 'avocadoNeedsManual',
    name: '需要使用說明',
    description: '我方使用指定其他角色的統籌卡時，自身 Stress +1；作品目標與全員型統籌卡不觸發。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'cardPlayed',
      condition: {
        kind: 'all',
        conditions: [
          { kind: 'relation', field: 'actorId', relation: 'ally' },
          { kind: 'sourceKind', value: 'coordination' },
        ],
      },
      effects: [{ kind: 'custom', handler: 'avocadoNeedsManual' }],
    }],
  },
]);
