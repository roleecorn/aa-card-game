import type { CharacterState } from './types';

export const GAMEPLAY_STATUS = {
  stressImmune: 'stress-immune',
  actionBlocked: 'action-blocked',
  coordinationUntargetable: 'coordination-untargetable',
  coordinationDisabledAsLeader: 'coordination-disabled-as-leader',
  leaderStressCapBonus: 'leader-stress-cap-bonus',
  actingLeaderStressCapBonus: 'acting-leader-stress-cap-bonus',
  hidden: 'hidden',
  textStatZero: 'text-stat-zero',
  aaStatZero: 'aa-stat-zero',
} as const;

export type GameplayStatus = (typeof GAMEPLAY_STATUS)[keyof typeof GAMEPLAY_STATUS];

export function getStatusStacks(member: CharacterState, status: GameplayStatus): number {
  return member.statuses[status]?.stacks ?? 0;
}

export function hasGameplayStatus(member: CharacterState, status: GameplayStatus): boolean {
  if (getStatusStacks(member, status) > 0) return true;
  // 神隱 is a shared gameplay state: a hidden character cannot act and cannot
  // be selected by coordination effects. Keep that semantic centralized so
  // callers do not need character-specific hidden checks.
  if (getStatusStacks(member, GAMEPLAY_STATUS.hidden) > 0) {
    return status === GAMEPLAY_STATUS.actionBlocked || status === GAMEPLAY_STATUS.coordinationUntargetable;
  }
  return false;
}
