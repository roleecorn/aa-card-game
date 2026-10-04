import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const kitsuCharacter = characterDefinitionSchema.parse({
  id: 'kitsu',
  name: 'キツ',
  stats: { design: 1, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['笑', '怪'],
  skillIds: ['kitsuHappyElement', 'kitsuAkihabara'],
  tags: ['qa', 'regression'],
  portrait: 'assets/characters/portrait/kitsu.webp',
  compactPortrait: 'assets/characters/compact/kitsu.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-15 final：Design 1 / Text 1 / AA 2，Stress 4，適性（笑 / 怪）。',
    '「恰到好處的高興素」：組內若存在其他類型包含「怪」的作品，自身 Text +1；只判斷存在，不按件數疊加。',
    '「妙梗連發的秋葉原」：組內若存在其他類型包含「笑」的作品，自身 Design +1；只判斷存在，不按件數疊加。',
    '舊「重播三十次」已被本版完整覆蓋。',
  ],
});

export const kitsuSkills = skillDefinitionSchema.array().parse([
  {
    id: 'kitsuHappyElement',
    name: '恰到好處的高興素',
    description: '若我方存在其他類型包含「怪」的作品，自身 Text +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{
      kind: 'stat.workTypeCount',
      skill: 'text',
      workType: '怪',
      amountPerWork: 1,
      excludeOwnerWork: true,
      maxBonus: 1,
    }],
  },
  {
    id: 'kitsuAkihabara',
    name: '妙梗連發的秋葉原',
    description: '若我方存在其他類型包含「笑」的作品，自身 Design +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{
      kind: 'stat.workTypeCount',
      skill: 'design',
      workType: '笑',
      amountPerWork: 1,
      excludeOwnerWork: true,
      maxBonus: 1,
    }],
  },
]);
