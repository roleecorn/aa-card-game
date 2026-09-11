import type { CharacterState } from './types';

export const GAMEPLAY_STATUS = {
  stressImmune: 'stress-immune',
  actionBlocked: 'action-blocked',
  coordinationUntargetable: 'coordination-untargetable',
  coordinationDisabledAsLeader: 'coordination-disabled-as-leader',
  leaderStressCapBonus: 'leader-stress-cap-bonus',
} as const;

export type GameplayStatus = (typeof GAMEPLAY_STATUS)[keyof typeof GAMEPLAY_STATUS];

export function getStatusStacks(member: CharacterState, status: GameplayStatus): number {
  return member.statuses[status]?.stacks ?? 0;
}

export function hasGameplayStatus(member: CharacterState, status: GameplayStatus): boolean {
  return getStatusStacks(member, status) > 0;
}
