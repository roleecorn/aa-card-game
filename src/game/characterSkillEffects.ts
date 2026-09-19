import { registerCustomSkillEffect } from './customEffects';
import type { EngineSession } from './engine';
import type { DieToken } from './types';

function rerollLowDie(die: DieToken, engine: EngineSession, sourceId: string, sourceName: string): boolean {
  const before = die.value;
  const rerolled = engine.rollDieFor(die.ownerId);
  const teamId = engine.findMemberTeam(die.ownerId);
  if (teamId) {
    engine.adjustStress(
      teamId,
      die.ownerId,
      1,
      sourceName,
      die.ownerId !== sourceId,
      sourceId,
    );
  }
  if (rerolled === undefined) {
    if (teamId) {
      const team = engine.getTeam(teamId);
      team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
    }
    engine.log(`${sourceName}：${engine.getDefinition(die.ownerId).name} 的骰子因沒有合法骰面而消失。`);
    return false;
  }
  die.value = rerolled;
  engine.log(`${sourceName}：${engine.getDefinition(die.ownerId).name} 重擲 ${before} → ${die.value}。`);
  return true;
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
      const survived = rerollLowDie(die, engine, context.ownerId, context.definition.name);
      rerolls += 1;
      if (!survived && context.event.dice) {
        context.event.dice.splice(0, context.event.dice.length, ...context.event.dice.filter((candidate) => candidate.id !== die.id));
      }
      continue;
    }

    let attempts = 0;
    let survived = true;
    while (die.value <= 2 && attempts < 20) {
      survived = rerollLowDie(die, engine, context.ownerId, context.definition.name);
      rerolls += 1;
      attempts += 1;
      if (!survived) {
        if (context.event.dice) {
          context.event.dice.splice(0, context.event.dice.length, ...context.event.dice.filter((candidate) => candidate.id !== die.id));
        }
        break;
      }
    }
    if (!survived) continue;
    if (die.value <= 2) {
      // Deterministic/faulty RNG must not be able to hang a triggered skill forever.
      die.value = 3;
      engine.log(`${context.definition.name}：重擲安全上限已達，將骰值固定為 3。`);
    }
  }
  return rerolls > 0;
});

registerCustomSkillEffect('pintboxTeamReview', (_effect, context, engine) => {
  const team = engine.getTeam(context.ownerTeamId);
  let changed = false;

  for (const member of [...team.members]) {
    let passes = 0;
    while (passes < 20) {
      const low = team.pendingDice.filter((die) => die.ownerId === member.defId && die.value <= 2);
      if (!low.length) break;

      // The Stress change resolves first. If it exceeds the cap, the common Stress rule
      // clears this member's pending dice before we attempt any reroll.
      engine.adjustStress(context.ownerTeamId, member.defId, 1, context.definition.name, true, context.ownerId);
      changed = true;
      const stillPending = new Set(team.pendingDice.filter((die) => die.ownerId === member.defId).map((die) => die.id));
      if (!stillPending.size) break;

      for (const die of low) {
        if (!stillPending.has(die.id)) continue;
        const rerolled = engine.rollDieFor(die.ownerId);
        if (rerolled === undefined) {
          team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
          continue;
        }
        die.value = rerolled;
      }
      passes += 1;
    }
    if (passes >= 20 && team.pendingDice.some((die) => die.ownerId === member.defId && die.value <= 2)) {
      engine.log(`${context.definition.name}：${engine.getDefinition(member.defId).name} 的低點骰重擲達到安全上限，停止本次處理。`);
    }
  }
  return changed;
});

registerCustomSkillEffect('avocadoNeedsManual', (_effect, context, engine) => {
  if (context.event.type !== 'cardPlayed' || context.event.sourceKind !== 'coordination') return false;
  const cardId = context.event.metadata?.cardId;
  if (typeof cardId !== 'string') return false;
  const card = engine.content.cards[cardId];
  // Latest rule only reacts to a coordination card aimed at another member.
  // Work-target and team-wide cards are explicit exceptions.
  if (!card || card.target.kind !== 'member' || !context.event.targetId || context.event.targetId === context.ownerId) return false;
  engine.adjustStress(context.ownerTeamId, context.ownerId, 1, context.definition.name);
  return true;
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

// afterDiceGranted observes dice that are already present in pendingDice. The
// generic removeEventDiceAtOrBelow handler is sufficient for transient roll
// batches, but granted dice must also be removed from the persistent state.
registerCustomSkillEffect('removeGrantedDiceAtOrBelow', (effect, context, engine) => {
  const maxValue = effect.args?.maxValue;
  const dice = context.event.dice;
  if (context.event.type !== 'afterDiceGranted' || typeof maxValue !== 'number' || !dice?.length) return false;

  const removed = dice.filter((die) => die.value <= maxValue);
  if (!removed.length) return false;
  const removedIds = new Set(removed.map((die) => die.id));
  dice.splice(0, dice.length, ...dice.filter((die) => !removedIds.has(die.id)));

  const teamId = context.event.teamId ?? context.ownerTeamId;
  const team = engine.getTeam(teamId);
  team.pendingDice = team.pendingDice.filter((die) => !removedIds.has(die.id));
  engine.log(`${context.definition.name}：${removed.length} 顆點數 ${maxValue} 以下的骰無法使用。`);
  return true;
});
