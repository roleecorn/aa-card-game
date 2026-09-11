import { skillDefinitionSchema } from '../game/schema';
import { GAMEPLAY_STATUS } from '../game/statuses';

export const LEGACY_GAMEPLAY_TAGS = [
  'no-stress',
  'cannot-act',
  'coordination-untargetable',
  'coordination-disabled-as-leader',
  'not-standard-playable',
] as const;

export const gameplayBoundarySkillIdsByCharacter: Record<string, string[]> = {
  chaos: ['chaosStressImmunity'],
  weakzhi: ['weakzhiRestrictions'],
};

export const gameplayBoundarySkills = skillDefinitionSchema.array().parse([
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
  {
    id: 'weakzhiRestrictions',
    name: '行動限制',
    description: '不能行動、不能成為統籌卡目標；若擔任組長，隊伍不能使用統籌卡。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [
      {
        event: 'gameStart',
        effects: [
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.actionBlocked,
            stacks: 1,
            stacking: 'replace',
          },
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.coordinationUntargetable,
            stacks: 1,
            stacking: 'replace',
          },
          {
            kind: 'status.change',
            target: 'owner',
            status: GAMEPLAY_STATUS.coordinationDisabledAsLeader,
            stacks: 1,
            stacking: 'replace',
          },
        ],
      },
    ],
  },
]);
