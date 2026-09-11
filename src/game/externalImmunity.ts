import type { EngineSession } from './engine';
import type { EffectContext } from './types';

export function hasExternalEffectImmunity(engine: EngineSession, memberId: string): boolean {
  return engine.getCharacterSkills(memberId).some((skill) => skill.passives?.some(
    (passive) => passive.kind === 'effect.immunity' && passive.source === 'external',
  ));
}

export function selectedExternalTargetMemberId(
  engine: EngineSession,
  context: EffectContext,
): string | undefined {
  if (context.activationTarget?.memberId) return context.activationTarget.memberId;
  const workId = context.activationTarget?.workId;
  if (!workId) return undefined;
  return [...engine.state.player.works, ...engine.state.enemy.works]
    .find((work) => work.id === workId)?.ownerId;
}
