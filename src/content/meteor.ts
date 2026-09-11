import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const meteorCharacter = characterDefinitionSchema.parse({
  id: 'meteor',
  name: '流星',
  stats: { design: 0, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['燃'],
  skillIds: ['meteorTrack', 'viceLeaderPower'],
  tags: ['vice-leader'],
  portrait: '/assets/characters/portrait/meteor.webp',
  compactPortrait: '/assets/characters/compact/meteor.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-03 07:20:07：PintBox 明確設計「流星」卡：Text 1、AA 2；技能「軌」在（燃）作品時可額外擲 2 顆骰取高。',
    '2026-09-03 07:32:45：PintBox 後續將流星壓力上限修正為約 4，因此採 4。',
    'Design 未在卡面訊息中列出；依目前 prototype 對未列能力的慣例採 0。',
    '「軌」runtime：每回合一次，自己的作品為（燃）時擲兩次 Text 判定並保留較高者作為 1 顆額外 Text 骰。',
    '2026-09-10 角色校正：統籌卡系能力與三角統一為「副組長力」；只有自身壓力低於組長時，才代替組長承擔 +1 外部壓力。',
    'dataset(1).zip 中 METEOR 共 1637 則訊息；其短促直接、對資訊節奏敏感的發言用於 visual brief，但不改寫 PintBox 已定義的卡面數值。',
    '2026-09-10 角色校正：作品適性定案為僅（燃）。',
  ],
});

export const meteorSkills = skillDefinitionSchema.array().parse([
  {
    id: 'meteorTrack',
    name: '軌',
    description: '每回合一次；自己的作品為（燃）時，擲 2 次 Text 並保留較高者，作為 1 顆額外 Text 骰。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [{
      kind: 'dice.grantBestOf',
      target: 'owner',
      skill: 'text',
      rolls: 2,
      count: 1,
      origin: '軌',
      requireOwnerWorkType: '燃',
    }],
  },
  {
    id: 'meteorCoordination',
    name: '副組長聖體',
    description: '隊伍使用統籌卡時，由流星代替隊長承擔 +1 外部壓力。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'coordination.stressBearer' }],
  },
]);
