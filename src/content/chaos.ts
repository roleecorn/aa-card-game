import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
import { GAMEPLAY_STATUS } from '../game/statuses';

export const chaosCharacter = characterDefinitionSchema.parse({
  id: 'chaos',
  name: '卡奧斯',
  stats: { design: 3, text: 3, aa: 3 },
  maxStress: null,
  affinities: ['情', '謀', '笑'],
  skillIds: ['chaosSteadyRoll', 'chaosVitality', 'chaosStressImmunity'],
  tags: ['boss'],
  portrait: '/assets/characters/portrait/chaos.webp',
  compactPortrait: '/assets/characters/compact/chaos.webp',
  portraitPosition: { x: 50, y: 12 },
  resource: { name: '體力', max: 5, initial: 5 },
  sourceNotes: [
    '2026-09-05 11:30:40：Text / Design / AA 全 3。',
    '體力 5，沒有壓力條；每回合體力 -1。',
    '不會擲出 3 以下；Pintbox 表示可按 Boss 設計。',
    'runtime 以角色 resource 保存體力，roundEnd -1；壓力免疫由 chaosStressImmunity Skill 套用。',
    'Standard 3v3 eligibility 由 match configuration 排除，不使用角色 Tag。',
    '2026-09-10 角色校正：作品適性定案為（情）（謀）（笑）。',
  ],
});

export const chaosSkills = skillDefinitionSchema.array().parse([
  {
    id: 'chaosSteadyRoll',
    name: 'Boss 級穩定輸出',
    description: '不會擲出 3 以下。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'roll.floor', value: 3 }],
  },
  {
    id: 'chaosVitality',
    name: 'Boss 體力',
    description: '初始體力 5，沒有壓力條；每回合結束時體力 -1。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'roundEnd',
      effects: [{ kind: 'custom', handler: 'changeOwnerResource', args: { resource: '體力', amount: -1 } }],
    }],
  },
  {
    id: 'chaosStressImmunity',
    name: '無壓力體質',
    description: '遊戲開始時取得壓力免疫；所有一般 Stress 變化無效。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'gameStart',
      effects: [{
        kind: 'status.change',
        target: 'owner',
        status: GAMEPLAY_STATUS.stressImmune,
        stacks: 1,
        stacking: 'replace',
      }],
    }],
  },
]);
