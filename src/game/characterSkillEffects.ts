import { registerCustomSkillEffect } from './customEffects';
import type { DieToken } from './types';

function rerollLowDie(die: DieToken, engine: Parameters<Parameters<typeof registerCustomSkillEffect>[1]>[2], sourceId: string, sourceName: string): void {
  const before = die.value;
  die.value = engine.rollDieFor(die.ownerId);
  engine.adjustStress(
    engine.findMemberTeam(die.ownerId) ?? 'player',
    die.ownerId,
    1,
    sourceName,
    die.ownerId !== sourceId,
    sourceId,
  );
  engine.log(`${sourceName}：${engine.getDefinition(die.ownerId).name} 重擲 ${before} → ${die.value}。`);
}

registerCustomSkillEffect('reviewLowPendingDice', (effect, context, engine) => {
  const repeatUntilThree = effect.args?.repeatUntilThree === true;
  const team = engine.getTeam(context.ownerTeamId);
  const candidates = new Map<string, DieToken>();
  for (const die of team.pendingDice) if (die.value <= 2) candidates.set(die.id, die);
  for (const die of context.event.dice ?? []) if (die.value <= 2) candidates.set(die.id, die);
  if (!candidates.size) return false;

  let rerolls = 0;
  for (const die of candidates.values()) {
    if (!repeatUntilThree) {
      rerollLowDie(die, engine, context.ownerId, context.definition.name);
      rerolls += 1;
      continue;
    }

    let attempts = 0;
    while (die.value <= 2 && attempts < 20) {
      rerollLowDie(die, engine, context.ownerId, context.definition.name);
      rerolls += 1;
      attempts += 1;
    }
    if (die.value <= 2) {
      // Deterministic/faulty RNG must not be able to hang a triggered skill forever.
      die.value = 3;
      engine.log(`${context.definition.name}：重擲安全上限已達，將骰值固定為 3。`);
    }
  }
  return rerolls > 0;
});

registerCustomSkillEffect('fengyangWakeUp', (_effect, context, engine) => {
  const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
  const team = engine.getTeam(context.ownerTeamId);
  const maxStress = engine.getEffectiveMaxStress(context.ownerTeamId, context.ownerId);
  if (!owner || maxStress === null || maxStress === undefined || owner.stress < maxStress) return false;

  if (team.leaderId === context.ownerId) {
    engine.log(`${context.definition.name}：風揚就是組長，-1 與 +1 Stress 互相抵消。`);
    return true;
  }

  engine.adjustStress(context.ownerTeamId, context.ownerId, -1, context.definition.name);
  engine.adjustStress(context.ownerTeamId, team.leaderId, 1, context.definition.name, true, context.ownerId);
  return true;
});
