import type { EngineSession } from './engine';
import type { EffectContext } from './types';

export function hasExternalEffectImmunity(engine: EngineSession, memberId: string): boolean {
  return engine.getCharacterSkills(memberId).some((skill) => skill.passives?.some(
    (passive) => passive.kind === 'effect.immunity' && passive.source === 'external',
  ));
}

/**
 * External-effect immunity is an effect-resolution rule, not a targeting rule.
 *
 * - A Skill owned by the target is self-originated and may affect that target.
 * - A Skill owned by another character is external to the target.
 * - A Card effect is always treated as external to the affected character.
 *
 * Returning true means the effect resolves as a no-op. It does NOT mean the
 * member/work is an illegal target and must never be used to filter selectors.
 */
export function isExternalEffectBlocked(
  engine: EngineSession,
  context: EffectContext,
  memberId: string,
): boolean {
  if (!hasExternalEffectImmunity(engine, memberId)) return false;

  const skill = engine.content.skills[context.definition.id];
  if (skill === context.definition) return memberId !== context.ownerId;

  const card = engine.content.cards[context.definition.id];
  if (card === context.definition) return true;

  return false;
}

export function isCardEffectBlocked(engine: EngineSession, memberId: string): boolean {
  return hasExternalEffectImmunity(engine, memberId);
}
