import type { ActionChoice, SkillActivationTarget } from './types';
import type { CardDefinition } from './schema';
import type { EngineSession } from './engine';

export function runEnemyPreTurnAi(engine: EngineSession): void {
  useAutomaticSkills(engine);
  useOneCard(engine);
}

export function chooseEnemyActions(engine: EngineSession): Record<string, ActionChoice> {
  return Object.fromEntries(engine.state.enemy.members.map((member) => {
    const max = engine.getEffectiveMaxStress('enemy', member.defId);
    return [member.defId, max !== null && max !== undefined && member.stress >= max ? 'slack' : 'work'];
  })) as Record<string, ActionChoice>;
}

function useAutomaticSkills(engine: EngineSession): void {
  for (const member of engine.state.enemy.members) {
    const definition = engine.getDefinition(member.defId);
    for (const skillId of definition.skillIds) {
      const skill = engine.content.skills[skillId];
      if (!skill?.ai?.autoUse || skill.activation !== 'active' || skill.status === 'planned') continue;
      if ((skill.activeTarget?.kind ?? 'none') !== 'none') continue;
      if (skill.ai.when === 'ownerStressed' && member.stress <= 0) continue;
      if (engine.canUseActiveSkill(member.defId, skill.id)) engine.activateSkill('enemy', member.defId, skill.id);
    }
  }
}

function useOneCard(engine: EngineSession): void {
  const candidates = engine.state.enemy.hand
    .map((instance) => ({ instance, card: engine.content.cards[instance.cardId] }))
    .filter((entry): entry is { instance: typeof entry.instance; card: CardDefinition } => !!entry.card?.ai?.autoUse)
    .sort((a, b) => (b.card.ai?.priority ?? 0) - (a.card.ai?.priority ?? 0));

  for (const { instance, card } of candidates) {
    const target = chooseCardTarget(engine, card);
    if (target && engine.playCard('enemy', instance.instanceId, target)) return;
  }
}

function effectiveStressCap(engine: EngineSession, memberId: string): number {
  const teamId = engine.findMemberTeam(memberId);
  if (!teamId) return Number.POSITIVE_INFINITY;
  return engine.getEffectiveMaxStress(teamId, memberId) ?? Number.POSITIVE_INFINITY;
}

function chooseCardTarget(engine: EngineSession, card: CardDefinition): SkillActivationTarget | undefined {
  const policy = card.ai?.when ?? 'always';
  if (card.target.kind === 'member') {
    const pool = card.target.relation === 'ally' ? engine.state.enemy.members : engine.state.player.members;
    if (!pool.length) return undefined;

    if (policy === 'allyStressAtLeast2') {
      const target = [...pool].sort((a, b) => b.stress - a.stress)[0];
      return target && target.stress >= 2 ? { memberId: target.defId } : undefined;
    }
    if (policy === 'enemyLowestHeadroom') {
      const target = [...pool].sort((a, b) => {
        const maxA = effectiveStressCap(engine, a.defId);
        const maxB = effectiveStressCap(engine, b.defId);
        return (maxA - a.stress) - (maxB - b.stress);
      })[0];
      return target ? { memberId: target.defId } : undefined;
    }
    return { memberId: pool[0]!.defId };
  }
  return card.target.kind === 'none' ? {} : undefined;
}
