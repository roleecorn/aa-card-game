import { skillDefinitionSchema } from '../game/schema';

export const viceLeaderPowerSkill = skillDefinitionSchema.parse({
  id: 'viceLeaderPower',
  name: '副組長力',
  description: '隊伍使用統籌卡時，如果自身壓力小於組長，由自身代替組長承擔 +1 外部壓力。',
  activation: 'passive',
  status: 'implemented',
  passives: [{ kind: 'coordination.stressBearer' }],
});
