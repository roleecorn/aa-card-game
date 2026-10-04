import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const enkiCharacter = characterDefinitionSchema.parse({
  id: 'enki',
  name: 'Enki',
  stats: { design: 3, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['謀'],
  skillIds: ['enkiViceLeader', 'enkiActingLeader', 'enkiMysteryJojo'],
  portrait: 'assets/characters/portrait/enki.webp',
  compactPortrait: 'assets/characters/compact/enki.webp',
  sourceNotes: [
    '2026-09-16 final：「推理jojo劇場」Text 增加量 = 我方類型包含「謀」的作品數 - 1。',
    '「副組長力」保留並使用共通 headroom 規則。',
    '「代組長力」維持既有已實裝行為。',
    '舊版「自己的作品是謀時固定 Text +1」已被覆蓋。',
  ],
});

export const enkiSkills = skillDefinitionSchema.array().parse([
  {
    id: 'enkiViceLeader',
    name: '副組長力',
    description: '隊伍使用統籌卡時，依共通 headroom 規則判定是否由自身承擔通常的統籌卡 Stress。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'coordination.stressBearer', allowEqual: true }],
  },
  {
    id: 'enkiActingLeader',
    name: '代組長力',
    description: '原組長神隱時，自身壓力上限永久 +2；每局只觸發一次。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'activeSkill',
      usage: { scope: 'game', limit: 1 },
      condition: { kind: 'eventMeta', key: 'hiddenEvent', equals: true },
      effects: [{ kind: 'custom', handler: 'grantActingLeaderStressCapIfLeaderHidden' }],
    }],
  },
  {
    id: 'enkiMysteryJojo',
    name: '推理jojo劇場',
    description: '自身 Text 增加量 = 我方類型包含「謀」的作品數 - 1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.workTypeCount', skill: 'text', workType: '謀', amountPerWork: 1, offset: -1 }],
  },
]);
