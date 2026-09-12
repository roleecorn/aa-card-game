import type { MemberSelector, SkillEffect, WorkSelector } from './schema';
import type { EffectContext } from './types';
import type { EngineSession } from './engine';
import { executeCustomSkillEffect } from './customEffects';
import { isExternalEffectBlocked } from './externalImmunity';

type EffectKind = SkillEffect['kind'];
type EffectByKind<K extends EffectKind> = Extract<SkillEffect, { kind: K }>;
type EffectHandler<K extends EffectKind = EffectKind> = (
  effect: EffectByKind<K>,
  context: EffectContext,
  engine: EngineSession,
) => boolean;

export class EffectRegistry {
  private readonly handlers = new Map<EffectKind, EffectHandler>();

  register<K extends EffectKind>(kind: K, handler: EffectHandler<K>): this {
    this.handlers.set(kind, handler as unknown as EffectHandler);
    return this;
  }

  execute(effect: SkillEffect, context: EffectContext, engine: EngineSession): boolean {
    const handler = this.handlers.get(effect.kind);
    if (!handler) throw new Error(`No effect handler registered for ${effect.kind}`);
    return handler(effect as never, context, engine);
  }
}

function numberValue(value: number | { fromEvent: 'amount' | 'diceCount' }, context: EffectContext): number {
  if (typeof value === 'number') return value;
  return value.fromEvent === 'diceCount' ? context.event.dice?.length ?? 0 : context.event.amount ?? 0;
}

function resolveEffectMembers(selector: MemberSelector, context: EffectContext, engine: EngineSession) {
  const selected = engine.resolveMembers(selector, context);
  const applicable = selected.filter(({ member }) => !isExternalEffectBlocked(engine, context, member.defId));
  return { selected, applicable, blocked: applicable.length < selected.length };
}

function resolveEffectWorks(selector: WorkSelector, context: EffectContext, engine: EngineSession) {
  const selected = engine.resolveWorks(selector, context);
  const applicable = selected.filter((work) => !isExternalEffectBlocked(engine, context, work.ownerId));
  return { selected, applicable, blocked: applicable.length < selected.length };
}

export const builtInEffects = new EffectRegistry()
  .register('stress.change', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets } = resolveEffectMembers(effect.target, context, engine);
    const amount = numberValue(effect.amount, context);
    for (const { teamId, member } of targets) {
      engine.adjustStress(teamId, member.defId, amount, effect.source ?? context.definition.name, effect.external ?? false, context.ownerId);
    }
    return selectedMembers.length > 0;
  })
  .register('stress.set', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets } = resolveEffectMembers(effect.target, context, engine);
    for (const { teamId, member } of targets) {
      engine.adjustStress(teamId, member.defId, effect.value - member.stress, effect.source ?? context.definition.name);
    }
    return selectedMembers.length > 0;
  })
  .register('event.amount', (effect, context) => {
    if (context.event.amount === undefined) return false;
    let next = context.event.amount + effect.amount;
    if (effect.min !== undefined) next = Math.max(effect.min, next);
    if (effect.max !== undefined) next = Math.min(effect.max, next);
    context.event.amount = next;
    return true;
  })
  .register('event.cancel', (_effect, context) => {
    context.event.cancelled = true;
    return true;
  })
  .register('dice.grant', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets } = resolveEffectMembers(effect.target, context, engine);
    const count = Math.max(0, Math.floor(numberValue(effect.count, context)));
    for (const { teamId, member } of targets) {
      engine.grantDice(teamId, member.defId, effect.skill, count, effect.origin ?? context.definition.name, effect.extra ?? true, effect.minRoll);
    }
    return selectedMembers.length > 0 && count > 0;
  })
  .register('dice.grantBestOf', (effect, context, engine) => {
    if (effect.requireOwnerWorkType) {
      const ownerWork = engine.getTeam(context.ownerTeamId).works.find((work) => work.ownerId === context.ownerId);
      if (ownerWork?.type !== effect.requireOwnerWorkType) return false;
    }
    const { selected: selectedMembers, applicable: targets, blocked } = resolveEffectMembers(effect.target, context, engine);
    if (!targets.length) return selectedMembers.length > 0;
    const rolls = Array.from({ length: effect.rolls }, () => engine.rollDieFor(context.ownerId));
    const best = Math.max(...rolls);
    let grantedCount = 0;
    for (const { teamId, member } of targets) {
      const granted = engine.grantDice(teamId, member.defId, effect.skill, effect.count, effect.origin ?? context.definition.name, true);
      for (const die of granted) die.value = engine.asDieValue(best);
      grantedCount += granted.length;
    }
    if (grantedCount > 0) engine.log(`${context.definition.name}：擲出 ${rolls.join('、')}，保留 ${best}。`);
    return grantedCount > 0 || blocked;
  })
  .register('dice.rerollBatch', (effect, context, engine) => {
    let dice = context.event.dice ?? [];
    dice = dice.filter((die) => {
      if (effect.skill && die.skill !== effect.skill) return false;
      if (effect.minValue !== undefined && die.value < effect.minValue) return false;
      if (effect.maxValue !== undefined && die.value > effect.maxValue) return false;
      return true;
    });
    if (effect.lowestFirst !== false) dice = [...dice].sort((a, b) => a.value - b.value);
    const targets = dice.slice(0, effect.count);
    let changed = 0;
    let blocked = 0;
    for (const die of targets) {
      if (isExternalEffectBlocked(engine, context, die.ownerId)) {
        blocked += 1;
        continue;
      }
      const before = die.value;
      die.value = engine.rollDieFor(die.ownerId);
      changed += 1;
      engine.log(`${context.definition.name}：${engine.getDefinition(die.ownerId).name} 重擲 ${before} → ${die.value}。`);
    }
    return changed > 0 || blocked > 0;
  })
  .register('dice.modifyPending', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets, blocked } = resolveEffectMembers(effect.target, context, engine);
    let changed = 0;
    for (const { teamId, member } of targets) {
      let dice = engine.getTeam(teamId).pendingDice.filter((die) => die.ownerId === member.defId);
      if (effect.skill) dice = dice.filter((die) => die.skill === effect.skill);
      if (effect.minValue !== undefined) dice = dice.filter((die) => die.value >= effect.minValue!);
      if (effect.maxValue !== undefined) dice = dice.filter((die) => die.value <= effect.maxValue!);
      for (const die of dice.slice(0, effect.limit ?? dice.length)) {
        const event = engine.skills.emit({
          type: 'beforeDieModified', teamId, actorId: context.ownerId, targetId: member.defId,
          dieId: die.id, skill: die.skill, amount: effect.add ?? 0, metadata: { reason: context.definition.id },
        });
        if (event.cancelled) continue;
        if (effect.set !== undefined) die.value = engine.asDieValue(effect.set);
        if (effect.add !== undefined) die.value = engine.asDieValue(die.value + effect.add);
        changed += 1;
        engine.skills.emit({ ...event, type: 'afterDieModified' });
      }
    }
    return changed > 0 || (blocked && selectedMembers.length > 0);
  })
  .register('dice.copySelectedValue', (_effect, context, engine) => {
    const sourceId = context.activationTarget?.sourceDieId;
    const targetId = context.activationTarget?.targetDieId;
    if (!sourceId || !targetId) return false;
    const team = engine.getTeam(context.ownerTeamId);
    const source = team.pendingDice.find((die) => die.id === sourceId);
    const target = team.pendingDice.find((die) => die.id === targetId);
    if (!source || !target || source.ownerId === context.ownerId || target.ownerId !== context.ownerId) return false;
    const event = engine.skills.emit({
      type: 'beforeDieModified', teamId: context.ownerTeamId, actorId: context.ownerId,
      targetId: context.ownerId, sourceId: source.ownerId, dieId: target.id, skill: target.skill,
      metadata: { reason: context.definition.id },
    });
    if (event.cancelled) return false;
    target.value = source.value;
    engine.skills.emit({ ...event, type: 'afterDieModified' });
    return true;
  })
  .register('dice.modifySelected', (effect, context, engine) => {
    const dieId = context.activationTarget?.targetDieId;
    if (!dieId) return false;
    const teams = [context.ownerTeamId, engine.opponentId(context.ownerTeamId)] as const;
    for (const teamId of teams) {
      const die = engine.getTeam(teamId).pendingDice.find((candidate) => candidate.id === dieId);
      if (!die) continue;
      if (isExternalEffectBlocked(engine, context, die.ownerId)) return true;
      const event = engine.skills.emit({
        type: 'beforeDieModified', teamId, actorId: context.ownerId, targetId: die.ownerId,
        dieId: die.id, skill: die.skill, amount: effect.add ?? 0, metadata: { reason: context.definition.id },
      });
      if (event.cancelled) return false;
      if (effect.set !== undefined) die.value = engine.asDieValue(effect.set);
      if (effect.add !== undefined) die.value = engine.asDieValue(die.value + effect.add);
      engine.skills.emit({ ...event, type: 'afterDieModified' });
      return true;
    }
    return false;
  })
  .register('dice.removeSelected', (_effect, context, engine) => {
    const dieId = context.activationTarget?.targetDieId;
    if (!dieId) return false;
    for (const teamId of [context.ownerTeamId, engine.opponentId(context.ownerTeamId)] as const) {
      const team = engine.getTeam(teamId);
      const targetDie = team.pendingDice.find((die) => die.id === dieId);
      if (targetDie && isExternalEffectBlocked(engine, context, targetDie.ownerId)) return true;
      const before = team.pendingDice.length;
      team.pendingDice = team.pendingDice.filter((die) => die.id !== dieId);
      if (team.pendingDice.length !== before) return true;
    }
    return false;
  })
  .register('dice.removePending', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets, blocked } = resolveEffectMembers(effect.target, context, engine);
    let removed = 0;
    for (const { teamId, member } of targets) {
      const team = engine.getTeam(teamId);
      let dice = team.pendingDice.filter((die) => die.ownerId === member.defId);
      if (effect.skill) dice = dice.filter((die) => die.skill === effect.skill);
      if (effect.minValue !== undefined) dice = dice.filter((die) => die.value >= effect.minValue!);
      if (effect.maxValue !== undefined) dice = dice.filter((die) => die.value <= effect.maxValue!);
      if (effect.order === 'lowest') dice = [...dice].sort((a, b) => a.value - b.value);
      else if (effect.order === 'highest') dice = [...dice].sort((a, b) => b.value - a.value);
      else if (effect.order === 'random') dice = engine.shuffle(dice);
      const ids = new Set(dice.slice(0, effect.count ?? dice.length).map((die) => die.id));
      if (!ids.size) continue;
      team.pendingDice = team.pendingDice.filter((die) => !ids.has(die.id));
      removed += ids.size;
    }
    return removed > 0 || (blocked && selectedMembers.length > 0);
  })
  .register('dice.convertPending', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets, blocked } = resolveEffectMembers(effect.target, context, engine);
    let changed = 0;
    for (const { teamId, member } of targets) {
      let dice = engine.getTeam(teamId).pendingDice.filter((die) => die.ownerId === member.defId);
      if (effect.fromSkill) dice = dice.filter((die) => die.skill === effect.fromSkill);
      for (const die of dice.slice(0, effect.count ?? dice.length)) {
        if (die.skill === effect.toSkill) continue;
        die.skill = effect.toSkill;
        changed += 1;
      }
    }
    return changed > 0 || (blocked && selectedMembers.length > 0);
  })
  .register('stat.change', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets } = resolveEffectMembers(effect.target, context, engine);
    for (const { member } of targets) {
      if (effect.duration === 'round') {
        member.timedStatModifiers.push({
          id: engine.uid('modifier'), skill: effect.skill, amount: effect.amount, expiresAfterRound: engine.state.round,
        });
      } else {
        member.permanentStats[effect.skill] = Math.max(0, member.permanentStats[effect.skill] + effect.amount);
      }
    }
    return selectedMembers.length > 0;
  })
  .register('work.length', (effect, context, engine) => {
    const { selected: selectedWorks, applicable: works } = resolveEffectWorks(effect.target, context, engine);
    for (const work of works) engine.resizeWork(work, effect.amount, effect.min ?? 1);
    return selectedWorks.length > 0;
  })
  .register('work.type', (effect, context, engine) => {
    const { selected: selectedWorks, applicable: works } = resolveEffectWorks(effect.target, context, engine);
    for (const work of works) work.type = effect.workType;
    return selectedWorks.length > 0;
  })
  .register('work.progress.add', (effect, context, engine) => {
    const { selected: selectedWorks, applicable: works, blocked } = resolveEffectWorks(effect.target, context, engine);
    let changed = 0;
    for (const work of works) {
      const index = typeof effect.slot === 'number'
        ? effect.slot
        : work.slots.findIndex((slot) => slot[effect.skill] === undefined);
      const slot = work.slots[index];
      if (!slot) continue;
      slot[effect.skill] = engine.asDieValue(effect.value);
      changed += 1;
    }
    return changed > 0 || (blocked && selectedWorks.length > 0);
  })
  .register('work.progress.fill', (effect, context, engine) => {
    const { selected: selectedWorks, applicable: works } = resolveEffectWorks(effect.target, context, engine);
    for (const work of works) {
      for (const slot of work.slots) {
        if (slot.design === undefined) slot.design = engine.asDieValue(effect.value);
        if (slot.text === undefined) slot.text = engine.asDieValue(effect.value);
        if (slot.aa === undefined) slot.aa = engine.asDieValue(effect.value);
      }
    }
    return selectedWorks.length > 0;
  })
  .register('work.progress.rerollLowest', (effect, context, engine) => {
    const { selected: selectedWorks, applicable: works, blocked } = resolveEffectWorks(effect.target, context, engine);
    const cells = works.flatMap((work) => work.slots.flatMap((slot) => (['design', 'text', 'aa'] as const)
      .flatMap((skill) => slot[skill] === undefined ? [] : [{ slot, skill, value: slot[skill]! }])));
    cells.sort((a, b) => a.value - b.value);
    for (const cell of cells.slice(0, effect.count)) cell.slot[cell.skill] = engine.randomDie();
    return cells.length > 0 || (blocked && selectedWorks.length > 0);
  })
  .register('work.progress.clear', (effect, context, engine) => {
    const { selected: selectedWorks, applicable: works, blocked } = resolveEffectWorks(effect.target, context, engine);
    let cells = works.flatMap((work) => work.slots.flatMap((slot) => (['design', 'text', 'aa'] as const)
      .flatMap((skill) => {
        if (effect.skill && skill !== effect.skill) return [];
        return slot[skill] === undefined ? [] : [{ slot, skill, value: slot[skill]! }];
      })));
    if (effect.order === 'lowest') cells = cells.sort((a, b) => a.value - b.value);
    else if (effect.order === 'highest') cells = cells.sort((a, b) => b.value - a.value);
    else if (effect.order === 'random') cells = engine.shuffle(cells);
    const chosen = cells.slice(0, effect.count ?? cells.length);
    for (const cell of chosen) delete cell.slot[cell.skill];
    return chosen.length > 0 || (blocked && selectedWorks.length > 0);
  })
  .register('cards.add', (effect, context, engine) => {
    const count = Math.max(0, Math.floor(numberValue(effect.count, context)));
    engine.addCard(context.ownerTeamId, effect.cardId, count);
    return count > 0;
  })
  .register('cards.draw', (effect, context, engine) => {
    const teamId = effect.targetTeam === 'eventTeam' ? context.event.teamId ?? context.ownerTeamId : context.ownerTeamId;
    const count = Math.max(0, Math.floor(numberValue(effect.count, context)));
    engine.drawCards(teamId, count);
    return count > 0;
  })
  .register('cards.discardRandom', (effect, context, engine) => {
    const teamId = effect.targetTeam === 'owner' ? context.ownerTeamId : engine.opponentId(context.ownerTeamId);
    const team = engine.getTeam(teamId);
    const count = Math.min(team.hand.length, Math.max(0, Math.floor(numberValue(effect.count, context))));
    for (let i = 0; i < count; i += 1) {
      const index = Math.floor(engine.random() * team.hand.length);
      const [card] = team.hand.splice(index, 1);
      if (card) team.discard.push(card.cardId);
    }
    return count > 0;
  })
  .register('status.change', (effect, context, engine) => {
    const { selected: selectedMembers, applicable: targets } = resolveEffectMembers(effect.target, context, engine);
    for (const { member } of targets) {
      const current = member.statuses[effect.status]?.stacks ?? 0;
      const next = effect.stacking === 'replace'
        ? effect.stacks
        : effect.stacking === 'max'
          ? Math.max(current, effect.stacks)
          : current + effect.stacks;
      if (next <= 0) delete member.statuses[effect.status];
      else member.statuses[effect.status] = {
        stacks: next,
        feedbackSource: { ownerId: context.ownerId, ownerTeamId: context.ownerTeamId,
          id: context.definition.id, name: context.definition.name,
          kind: engine.content.cards[context.definition.id] === context.definition ? 'card' : 'skill' },
        expiresAfterRound: effect.durationRounds ? engine.state.round + effect.durationRounds - 1 : undefined,
      };
    }
    return selectedMembers.length > 0;
  })
  .register('log', (effect, context, engine) => {
    engine.log(effect.text.replaceAll('{owner}', engine.getDefinition(context.ownerId).name));
    return true;
  })
  .register('custom', (effect, context, engine) => executeCustomSkillEffect(effect, context, engine));
