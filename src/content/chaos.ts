import { skillDefinitionSchema } from '../game/schema';
import { GAMEPLAY_STATUS } from '../game/statuses';

export const chaosSkills = skillDefinitionSchema.array().parse([
  {
    id: 'chaosStressImmunity',
    name: '無壓力體質',
    description: '遊戲開始時取得壓力免疫；所有一般 Stress 變化無效。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'gameStart',
        effects: [
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.stressImmune,
            stacks: 1,
            stacking: 'replace',
          },
        ],
      },
    ],
  },
]);
