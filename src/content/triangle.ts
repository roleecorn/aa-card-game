import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const triangleCharacter = characterDefinitionSchema.parse({
  id: 'triangle',
  name: '三角希',
  stats: { design: 1, text: 2, aa: 2 },
  maxStress: 4,
  affinities: [],
  skillIds: ['triangleRecovery', 'triangleAffinity', 'viceLeaderPower'],
  tags: ['duo-card', 'triangle-creature'],
  portrait: 'assets/characters/portrait/triangle.webp',
  compactPortrait: 'assets/characters/compact/triangle.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-03 08:51:47：Text 2、Design 1、AA 2、壓力上限 4。',
    '「滾滾三角生物」目前規則：每回合一次，選擇自己以外的一個三角生物（不分敵我），自己與對方壓力各 -1；另保留全作品適性。',
    '2026-09-10 角色校正：統籌卡系能力與流星統一為「副組長力」。',
    '目前此 id 代表「三角希」雙人卡，由三角赤 + 有希組成；兩人共用同一張 portrait、數值與技能。',
    '未來可另外新增三角赤與有希的獨立單人角色卡，不覆寫此雙人卡。',
  ],
});

export const triangleSkills = skillDefinitionSchema.array().parse([
  {
    id: 'triangleRecovery',
    name: '滾滾三角生物',
    description: '每回合一次，選擇自己以外的一個「三角生物」（不分敵我）；自己與該角色的壓力各 -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeHint: '可選擇我方或敵方的三角生物，但不能選擇三角希自己。',
    activeTarget: { kind: 'taggedMember', tag: 'triangle-creature', excludeSelf: true },
    activeEffects: [
      { kind: 'stress.change', target: 'owner', amount: -1, source: '滾滾三角生物' },
      { kind: 'stress.change', target: 'selectedMember', amount: -1, source: '滾滾三角生物' },
    ],
  },
  {
    id: 'triangleAffinity',
    name: '全作品適性',
    description: '視為擁有全部作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'triangleCoordination',
    name: '統籌權限',
    description: '可以使用統籌卡；目前 team-level 出牌尚未記錄實際使用角色，因此權限檢查保留為規劃中。',
    activation: 'passive',
    status: 'planned',
    passives: [{ kind: 'card.permission', cardKind: 'coordination' }],
  },
]);
