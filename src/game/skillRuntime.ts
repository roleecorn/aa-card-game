import { builtInEffects } from './effectRegistry';
import type { SkillCondition, SkillEffect, SkillPassive, SkillDefinition, WorkType } from './schema';
import type { EffectContext, SkillActivationTarget, SkillEvent } from './types';
import type { EngineSession } from './engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from './statuses';

function compare(left: number, op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte', right: number): boolean {
  if (op === 'eq') return left === right;
  if (op === 'ne') return left !== right;
  if (op === 'lt') return left < right;
  if (op === 'lte') return left <= right;
  if (op === 'gt') return left > right;
  return left >= right;
}

function relation(engine: EngineSession, ownerId: string, otherId?: string): 'self' | 'otherAlly' | 'enemy' | undefined {
  if (!otherId) return undefined;
  if (ownerId === otherId) return 'self';
  const ownerTeam = engine.findMemberTeam(ownerId);
  const otherTeam = engine.findMemberTeam(otherId);
  if (!ownerTeam || !otherTeam) return undefined;
  return ownerTeam === otherTeam ? 'otherAlly' : 'enemy';
}

function workHasProgress(work: ReturnType<EngineSession['resolveWorks']>[number], skill?: 'design' | 'text' | 'aa'): boolean {
  return work.slots.some((slot) => skill ? slot[skill] !== undefined : slot.design !== undefined || slot.text !== undefined || slot.aa !== undefined);
}

export function matchesCondition(condition: SkillCondition, context: EffectContext, engine: EngineSession): boolean {
  if (condition.kind === 'always') return true;
  if (condition.kind === 'all') return condition.conditions.every((item) => matchesCondition(item, context, engine));
  if (condition.kind === 'any') return condition.conditions.some((item) => matchesCondition(item, context, engine));
  if (condition.kind === 'not') return !matchesCondition(condition.condition, context, engine);
  if (condition.kind === 'ownerStress') {
    const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
    return !!owner && compare(owner.stress, condition.op, condition.value);
  }
  if (condition.kind === 'ownerStressBelowCap') {
    const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
    const cap = engine.getEffectiveMaxStress(context.ownerTeamId, context.ownerId);
    return !!owner && (cap === null || (cap !== undefined && owner.stress < cap));
  }
  if (condition.kind === 'memberStress') {
    return engine.resolveMembers(condition.target, context).some(({ member }) => compare(member.stress, condition.op, condition.value));
  }
  if (condition.kind === 'eventAmount') return compare(context.event.amount ?? 0, condition.op, condition.value);
  if (condition.kind === 'eventSkill') return context.event.skill === condition.skill;
  if (condition.kind === 'sourceKind') return context.event.sourceKind === condition.value;
  if (condition.kind === 'eventMeta') return context.event.metadata?.[condition.key] === condition.equals;
  if (condition.kind === 'ownerHasStatus') {
    const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
    return (owner?.statuses[condition.status]?.stacks ?? 0) > 0;
  }
  if (condition.kind === 'round') return compare(engine.state.round, condition.op, condition.value);
  if (condition.kind === 'ownerStat') return compare(engine.getEffectiveStat(context.ownerId, condition.skill), condition.op, condition.value);
  if (condition.kind === 'pendingDice') {
    const count = engine.resolveMembers(condition.target, context).reduce((sum, { teamId, member }) => {
      const matches = engine.getTeam(teamId).pendingDice.filter((die) => {
        if (die.ownerId !== member.defId) return false;
        if (condition.skill && die.skill !== condition.skill) return false;
        if (condition.minValue !== undefined && die.value < condition.minValue) return false;
        if (condition.maxValue !== undefined && die.value > condition.maxValue) return false;
        return true;
      });
      return sum + matches.length;
    }, 0);
    return count >= (condition.countAtLeast ?? 1);
  }
  if (condition.kind === 'workType') {
    const works = engine.resolveWorks(condition.target, context);
    return works.some((work) => condition.types.some((type) => engine.workHasType(work, type)));
  }
  if (condition.kind === 'workScore') {
    const works = engine.resolveWorks(condition.target, context);
    if (!works.length) return false;
    const matches = (work: (typeof works)[number]) => compare(engine.scoreWork(work), condition.op, condition.value);
    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);
  }
  if (condition.kind === 'workLength') {
    const works = engine.resolveWorks(condition.target, context);
    if (!works.length) return false;
    const matches = (work: (typeof works)[number]) => compare(work.length, condition.op, condition.value);
    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);
  }
  if (condition.kind === 'workHasProgress') {
    const works = engine.resolveWorks(condition.target, context);
    if (!works.length) return false;
    const matches = (work: (typeof works)[number]) => workHasProgress(work, condition.skill);
    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);
  }
  if (condition.kind === 'workHasEmptyProgress') {
    const works = engine.resolveWorks(condition.target, context);
    if (!works.length) return false;
    const matches = (work: (typeof works)[number]) => work.slots.some((slot) =>
      condition.skill ? slot[condition.skill] === undefined :
        slot.design === undefined || slot.text === undefined || slot.aa === undefined);
    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);
  }
  if (condition.kind === 'chance') return engine.random() < condition.probability;
  if (condition.kind === 'relation') {
    const other = context.event[condition.field];
    const value = relation(engine, context.ownerId, other);
    if (condition.relation === 'ally') return value === 'self' || value === 'otherAlly';
    return value === condition.relation;
  }
  if (condition.kind === 'diceMatch') {
    const matches = (context.event.dice ?? []).filter((die) => {
      if (condition.skill && die.skill !== condition.skill) return false;
      if (condition.minValue !== undefined && die.value < condition.minValue) return false;
      if (condition.maxValue !== undefined && die.value > condition.maxValue) return false;
      return true;
    });
    return matches.length >= (condition.countAtLeast ?? 1);
  }
  return false;
}

export class SkillRuntime {
  private depth = 0;

  constructor(private readonly engine: EngineSession) {}

  emit(event: SkillEvent): SkillEvent {
    if (this.depth > 20) {
      this.engine.log('技能事件鏈超過安全深度，已停止後續觸發。');
      return event;
    }
    this.depth += 1;
    try {
      const triggers = (['player', 'enemy'] as const).flatMap((teamId) =>
        this.engine.getTeam(teamId).members.flatMap((member) => {
          const definition = this.engine.getDefinition(member.defId);
          return definition.skillIds.flatMap((skillId) => {
            const skill = this.engine.content.skills[skillId];
            if (!skill || skill.status === 'planned') return [];
            return (skill.triggers ?? [])
              .filter((trigger) => trigger.event === event.type)
              .map((trigger) => ({ ownerId: member.defId, ownerTeamId: teamId, skill, trigger }));
          });
        }),
      );
      triggers.sort((a, b) => (b.trigger.priority ?? 0) - (a.trigger.priority ?? 0));

      for (const entry of triggers) {
        if (event.cancelled) break;
        const context: EffectContext = {
          ownerId: entry.ownerId,
          ownerTeamId: entry.ownerTeamId,
          definition: entry.skill,
          event,
        };
        try {
          if (!matchesCondition(entry.trigger.condition ?? { kind: 'always' }, context, this.engine)) continue;
          if (entry.trigger.usage && !this.canUse(entry.ownerId, entry.skill.id, entry.trigger.usage)) continue;
          const applied = this.applyEffects(entry.trigger.effects, context);
          if (applied && entry.trigger.usage) this.markUsed(entry.ownerId, entry.skill.id, entry.trigger.usage);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.engine.log(`技能「${entry.skill.name}」觸發失敗，已略過：${message}`);
        }
      }
      return event;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.engine.log(`技能事件「${event.type}」處理失敗，已隔離：${message}`);
      return event;
    } finally {
      this.depth -= 1;
    }
  }

  activate(teamId: 'player' | 'enemy', memberId: string, skillId: string, target: SkillActivationTarget = {}): boolean {
    const member = this.engine.getCharacter(teamId, memberId);
    const skill = this.engine.content.skills[skillId];
    if (!member || !skill || skill.activation !== 'active' || skill.status === 'planned' || !skill.activeEffects) return false;
    if (!this.engine.getDefinition(memberId).skillIds.includes(skillId)) return false;
    if (!this.canActivateTarget(teamId, memberId, skill, target)) return false;

    const context = this.activeContext(teamId, memberId, skill, target);
    const applied = this.applyEffects(skill.activeEffects, context);
    if (!applied) return false;
    if (skill.activeUsage) this.markUsed(memberId, skillId, skill.activeUsage);
    this.engine.log(`${this.engine.getDefinition(memberId).name} 發動「${skill.name}」。`);
    this.emit(context.event);
    return true;
  }

  canUseActive(memberId: string, skillId: string): boolean {
    const skill = this.engine.content.skills[skillId];
    if (!skill || skill.activation !== 'active' || skill.status === 'planned' || !skill.activeEffects) return false;
    const teamId = this.engine.findMemberTeam(memberId);
    if (!teamId) return false;
    const member = this.engine.getCharacter(teamId, memberId);
    if (!member || hasGameplayStatus(member, GAMEPLAY_STATUS.actionBlocked)) return false;
    if (skill.activeUsage && !this.canUse(memberId, skillId, skill.activeUsage)) return false;
    return this.hasUsableActiveTarget(teamId, memberId, skill);
  }

  /** Runtime source of truth for one concrete active-skill target. UI targeting should delegate here. */
  canActivateTarget(teamId: 'player' | 'enemy', memberId: string, skill: SkillDefinition, target: SkillActivationTarget): boolean {
    const member = this.engine.getCharacter(teamId, memberId);
    if (!member || hasGameplayStatus(member, GAMEPLAY_STATUS.actionBlocked)) return false;
    if (skill.activeUsage && !this.canUse(memberId, skill.id, skill.activeUsage)) return false;
    if (!this.validateActiveTargetStructure(teamId, memberId, skill, target)) return false;
    if (!skill.activeCondition) return true;
    return matchesCondition(skill.activeCondition, this.activeContext(teamId, memberId, skill, target), this.engine);
  }

  canActivateSkillTarget(memberId: string, skillId: string, target: SkillActivationTarget): boolean {
    const teamId = this.engine.findMemberTeam(memberId);
    const skill = this.engine.content.skills[skillId];
    if (!teamId || !skill || skill.activation !== 'active' || skill.status === 'planned' || !skill.activeEffects) return false;
    if (!this.engine.getDefinition(memberId).skillIds.includes(skillId)) return false;
    return this.canActivateTarget(teamId, memberId, skill, target);
  }

  private activeContext(
    teamId: 'player' | 'enemy',
    memberId: string,
    skill: SkillDefinition,
    target: SkillActivationTarget,
  ): EffectContext {
    return {
      ownerId: memberId,
      ownerTeamId: teamId,
      definition: skill,
      event: {
        type: 'activeSkill',
        teamId,
        actorId: memberId,
        targetId: target.memberId,
        workId: target.workId,
        skill: target.skill,
        metadata: { sourceDieId: target.sourceDieId, targetDieId: target.targetDieId },
      },
      activationTarget: target,
    };
  }

  private hasUsableActiveTarget(teamId: 'player' | 'enemy', memberId: string, skill: SkillDefinition): boolean {
    const spec = skill.activeTarget ?? { kind: 'none' as const };
    if (spec.kind === 'none') return this.canActivateTarget(teamId, memberId, skill, {});

    if (spec.kind === 'member' || spec.kind === 'taggedMember') {
      return [...this.engine.state.player.members, ...this.engine.state.enemy.members]
        .some((member) => this.canActivateTarget(teamId, memberId, skill, { memberId: member.defId }));
    }

    if (spec.kind === 'work') {
      return [...this.engine.state.player.works, ...this.engine.state.enemy.works]
        .some((work) => this.canActivateTarget(teamId, memberId, skill, { workId: work.id }));
    }

    if (spec.kind === 'copyPendingDie') {
      const team = this.engine.getTeam(teamId);
      return team.pendingDice.some((source) => team.pendingDice.some((target) =>
        this.canActivateTarget(teamId, memberId, skill, { sourceDieId: source.id, targetDieId: target.id })));
    }

    const dice = spec.relation === 'enemy'
      ? this.engine.getTeam(this.engine.opponentId(teamId)).pendingDice
      : this.engine.getTeam(teamId).pendingDice;
    return dice.some((die) => this.canActivateTarget(teamId, memberId, skill, { targetDieId: die.id }));
  }

  getAffinity(memberId: string, base: WorkType[]): WorkType[] | 'all' {
    let result: WorkType[] | 'all' = [...base];
    for (const passive of this.passives(memberId)) {
      if (passive.kind !== 'affinity.grant') continue;
      if (passive.types === 'all') result = 'all';
      else if (result !== 'all') result = [...new Set([...result, ...passive.types])];
    }
    return result;
  }

  getStatModifier(memberId: string, skill: 'design' | 'text' | 'aa'): number {
    const teamId = this.engine.findMemberTeam(memberId);
    if (!teamId) return 0;
    const team = this.engine.getTeam(teamId);
    let total = 0;
    for (const passive of this.passives(memberId)) {
      if (passive.kind === 'stat.modify' && passive.skill === skill) total += passive.amount;
      if (passive.kind !== 'stat.workTypeCount' || passive.skill !== skill) continue;
      const matching = team.works.filter((work) => {
        if (passive.excludeOwnerWork && work.ownerId === memberId) return false;
        return this.engine.workHasType(work, passive.workType);
      }).length;
      let bonus = matching * passive.amountPerWork + passive.offset;
      if (passive.minBonus !== undefined) bonus = Math.max(passive.minBonus, bonus);
      if (passive.maxBonus !== undefined) bonus = Math.min(passive.maxBonus, bonus);
      total += bonus;
    }
    return total;
  }

  getRollFloor(memberId: string, base = 1): number {
    let floor = base;
    for (const passive of this.passives(memberId)) {
      if (passive.kind === 'roll.floor') floor = Math.max(floor, passive.value);
    }
    return Math.min(6, Math.max(1, floor));
  }

  getForbiddenRollFaces(memberId: string): Set<number> {
    const result = new Set<number>();
    for (const passive of this.passives(memberId)) {
      if (passive.kind === 'roll.forbid') passive.faces.forEach((face) => result.add(face));
    }
    const teamId = this.engine.findMemberTeam(memberId);
    const member = teamId ? this.engine.getCharacter(teamId, memberId) : undefined;
    for (const constraint of member?.timedRollConstraints ?? []) {
      constraint.forbiddenFaces.forEach((face) => result.add(face));
    }
    return result;
  }

  getCoordinationStressBearer(teamId: 'player' | 'enemy', amount = 1): string | undefined {
    const team = this.engine.getTeam(teamId);
    const leader = this.engine.getCharacter(teamId, team.leaderId);
    if (!leader) return undefined;

    const headroom = (memberId: string): number => {
      const member = this.engine.getCharacter(teamId, memberId);
      const maxStress = this.engine.getEffectiveMaxStress(teamId, memberId);
      if (!member || maxStress === undefined) return -Infinity;
      if (maxStress === null) return Infinity;
      return Math.max(0, maxStress - member.stress);
    };

    const leaderHeadroom = headroom(team.leaderId);
    const viceCandidates = team.members
      .filter((member) => member.defId !== team.leaderId && !hasGameplayStatus(member, GAMEPLAY_STATUS.hidden))
      .filter((member) => this.passives(member.defId).some((passive) => passive.kind === 'coordination.stressBearer'))
      .map((member) => ({ member, headroom: headroom(member.defId) }))
      .filter((entry) => entry.headroom >= amount && entry.headroom > leaderHeadroom)
      .sort((a, b) => b.headroom - a.headroom);

    if (viceCandidates[0]) return viceCandidates[0].member.defId;
    return leaderHeadroom >= amount ? team.leaderId : undefined;
  }

  private passives(memberId: string): SkillPassive[] {
    const definition = this.engine.getDefinition(memberId);
    return definition.skillIds.flatMap((skillId) => {
      const skill = this.engine.content.skills[skillId];
      return !skill || skill.status === 'planned' ? [] : skill.passives ?? [];
    });
  }

  private applyEffects(effects: SkillEffect[], context: EffectContext): boolean {
    return this.engine.feedback.capture(context, 'skill', () => {
      let applied = false;
      for (const effect of effects) {
        try {
          applied = builtInEffects.execute(effect, context, this.engine) || applied;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.engine.log(`技能「${context.definition.name}」效果執行失敗，已略過：${message}`);
        }
        if (context.event.cancelled) break;
      }
      return applied;
    });
  }

  private usageKey(skillId: string, usage: { scope: 'round' | 'game'; key?: string; group?: string }): string {
    const bucket = usage.group ?? skillId;
    const suffix = usage.key ?? 'default';
    return usage.scope === 'round' ? `${bucket}:${suffix}:round:${this.engine.state.round}` : `${bucket}:${suffix}:game`;
  }

  private canUse(memberId: string, skillId: string, usage: { scope: 'round' | 'game'; key?: string; group?: string; limit: number }): boolean {
    const teamId = this.engine.findMemberTeam(memberId);
    const member = teamId ? this.engine.getCharacter(teamId, memberId) : undefined;
    return !!member && (member.skillUsage[this.usageKey(skillId, usage)] ?? 0) < usage.limit;
  }

  private markUsed(memberId: string, skillId: string, usage: { scope: 'round' | 'game'; key?: string; group?: string; limit: number }): void {
    const teamId = this.engine.findMemberTeam(memberId);
    const member = teamId ? this.engine.getCharacter(teamId, memberId) : undefined;
    if (!member) return;
    const key = this.usageKey(skillId, usage);
    member.skillUsage[key] = (member.skillUsage[key] ?? 0) + 1;
  }

  private validateActiveTargetStructure(teamId: 'player' | 'enemy', memberId: string, skill: SkillDefinition, target: SkillActivationTarget): boolean {
    const spec = skill.activeTarget ?? { kind: 'none' as const };
    if (spec.kind === 'none') return true;
    if (spec.kind === 'member') {
      if (!target.memberId) return false;
      const targetTeam = this.engine.findMemberTeam(target.memberId);
      if (!targetTeam) return false;
      if (spec.relation === 'enemy') return targetTeam !== teamId;
      if (spec.relation === 'otherAlly') return targetTeam === teamId && target.memberId !== memberId;
      return targetTeam === teamId;
    }
    if (spec.kind === 'taggedMember') {
      if (!target.memberId) return false;
      if (spec.excludeSelf && target.memberId === memberId) return false;
      const targetTeam = this.engine.findMemberTeam(target.memberId);
      if (!targetTeam) return false;
      return this.engine.getDefinition(target.memberId).tags?.includes(spec.tag) ?? false;
    }
    if (spec.kind === 'work') {
      if (!target.workId) return false;
      const ownTeam = this.engine.getTeam(teamId);
      const enemyTeam = this.engine.getTeam(this.engine.opponentId(teamId));
      if (spec.relation === 'owner') return ownTeam.works.some((work) => work.id === target.workId && work.ownerId === memberId);
      if (spec.relation === 'ally') return ownTeam.works.some((work) => work.id === target.workId);
      return enemyTeam.works.some((work) => work.id === target.workId);
    }
    if (spec.kind === 'copyPendingDie') {
      if (!target.sourceDieId || !target.targetDieId || target.sourceDieId === target.targetDieId) return false;
      const team = this.engine.getTeam(teamId);
      const source = team.pendingDice.find((die) => die.id === target.sourceDieId);
      const destination = team.pendingDice.find((die) => die.id === target.targetDieId);
      if (!source || !destination) return false;
      const sourceMatches = spec.source === 'self' ? source.ownerId === memberId : source.ownerId !== memberId;
      const targetMatches = spec.target === 'self' ? destination.ownerId === memberId : destination.ownerId !== memberId;
      return sourceMatches && targetMatches && (!spec.requireValueChange || source.value !== destination.value);
    }
    if (!target.targetDieId) return false;
    const ownerTeam = this.engine.getTeam(teamId);
    const enemyTeam = this.engine.getTeam(this.engine.opponentId(teamId));
    const ownDie = ownerTeam.pendingDice.find((die) => die.id === target.targetDieId);
    const enemyDie = enemyTeam.pendingDice.find((die) => die.id === target.targetDieId);
    const die = spec.relation === 'enemy' ? enemyDie : ownDie;
    if (!die) return false;
    if (spec.relation === 'self' && die.ownerId !== memberId) return false;
    if (spec.relation === 'otherAlly' && die.ownerId === memberId) return false;
    if (spec.skill && die.skill !== spec.skill) return false;
    if (spec.minValue !== undefined && die.value < spec.minValue) return false;
    if (spec.maxValue !== undefined && die.value > spec.maxValue) return false;
    return true;
  }
}
