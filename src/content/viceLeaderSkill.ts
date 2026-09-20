import { skillDefinitionSchema } from '../game/schema';

export const viceLeaderPowerSkill = skillDefinitionSchema.parse({
  id: 'viceLeaderPower',
  name: '副組長力',
  description: '隊伍使用需要壓力費用的統籌卡時，若自身距離壓力上限的剩餘空間比組長更多，由自身代替組長承擔該費用。',
  activation: 'passive',
  status: 'implemented',
  passives: [{ kind: 'coordination.stressBearer' }],
});
