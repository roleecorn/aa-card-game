import { builtInEffects } from './effectRegistry';
import type { SkillCondition, SkillEffect, SkillPassive, SkillDefinition, WorkType } from './schema';
import type { EffectContext, SkillActivationTarget, SkillEvent } from './types';
import type { EngineSession } from './engine';

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

export function matchesCondition(condition: SkillCondition, context: EffectContext, engine: EngineSession): boolean {
  if (condition.kind === 'always') return true;
  if (condition.kind === 'all') return condition.conditions.every((item) => matchesCondition(item, context, engine));
  if (condition.kind === 'any') return condition.conditions.some((item) => matchesCondition(item, context, engine));
  if (condition.kind === 'not') return !matchesCondition(condition.condition, context, engine);
  if (condition.kind === 'ownerStress') {
    const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
    return !!owner && compare(owner.stress, condition.op, condition.value);
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
    return works.some((work) => condition.types.includes(work.type));
  }
  if (condition.kind === 'workScore') {
    const works = engine.resolveWorks(condition.target, context);
    if (!works.length) return false;
    const matches = (work: (typeof works)[number]) => compare(engine.scoreWork(work), condition.op, condition.value);
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
    if (skill.activeUsage && !this.canUse(memberId, skillId, skill.activeUsage)) return false;
    if (!this.validateActiveTarget(teamId, memberId, skill, target)) return false;

    const context: EffectContext = {
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
    const applied = this.applyEffects(skill.activeEffects, context);
    if (!applied) return false;
    if (skill.activeUsage) this.markUsed(memberId, skillId, skill.activeUsage);
    this.engine.log(`${this.engine.getDefinition(memberId).name} 發動「${skill.name}」。`);
    this.emit(context.event);
    return true;
  }

  canUseActive(memberId: string, skillId: string): boolean {
    const skill = this.engine.content.skills[skillId];
    if (!skill || skill.activation !== 'active' || skill.status === 'planned') return false;
    if (skill.activeUsage && !this.canUse(memberId, skillId, skill.activeUsage)) return false;
    const teamId = this.engine.findMemberTeam(memberId);
    if (!teamId) return false;
    return this.hasUsableActiveTarget(teamId, memberId, skill);
  }

  private hasUsableActiveTarget(teamId: 'player' | 'enemy', memberId: string, skill: SkillDefinition): boolean {
    const spec = skill.activeTarget ?? { kind: 'none' as const };

    if (spec.kind === 'none') {
      const effects = skill.activeEffects ?? [];
      if (!effects.length) return false;

      return effects.some((effect) => {
        if (effect.kind === 'dice.modifyPending') {
          const team = this.engine.getTeam(teamId);
          let dice = team.pendingDice.filter((die) => die.ownerId === memberId);
          if (effect.skill) dice = dice.filter((die) => die.skill === effect.skill);
          if (effect.minValue !== undefined) dice = dice.filter((die) => die.value >= effect.minValue!);
          if (effect.maxValue !== undefined) dice = dice.filter((die) => die.value <= effect.maxValue!);
          return dice.length > 0;
        }
        if (effect.kind === 'dice.grantBestOf' && effect.requireOwnerWorkType) {
          return this.engine.getTeam(teamId).works.some(
            (work) => work.ownerId === memberId && work.type === effect.requireOwnerWorkType,
          );
        }
        return true;
      });
    }

    if (spec.kind === 'member' || spec.kind === 'taggedMember') {
      return [...this.engine.state.player.members, ...this.engine.state.enemy.members]
        .some((member) => this.validateActiveTarget(teamId, memberId, skill, { memberId: member.defId }));
    }

    if (spec.kind === 'work') {
      return [...this.engine.state.player.works, ...this.engine.state.enemy.works]
        .some((work) => this.validateActiveTarget(teamId, memberId, skill, { workId: work.id }));
    }

    if (spec.kind === 'copyPendingDie') {
      const team = this.engine.getTeam(teamId);
      const sources = team.pendingDice.filter((die) => die.ownerId !== memberId);
      const targets = team.pendingDice.filter((die) => die.ownerId === memberId);
      return sources.length > 0 && targets.length > 0;
    }

    const dice = spec.relation === 'enemy'
      ? this.engine.getTeam(this.engine.opponentId(teamId)).pendingDice
      : this.engine.getTeam(teamId).pendingDice;
    return dice.some((die) => this.validateActiveTarget(teamId, memberId, skill, { targetDieId: die.id }));
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

  getRollFloor(memberId: string, base = 1): number {
    let floor = base;
    for (const passive of this.passives(memberId)) {
      if (passive.kind === 'roll.floor') floor = Math.max(floor, passive.value);
    }
    return Math.min(6, Math.max(1, floor));
  }

  getCoordinationStressBearer(teamId: 'player' | 'enemy'): string | undefined {
    const team = this.engine.getTeam(teamId);
    const leader = this.engine.getCharacter(teamId, team.leaderId);
    if (!leader) return undefined;

    return team.members.find((member) => {
      if (member.defId === team.leaderId || member.stress >= leader.stress) return false;
      return this.passives(member.defId).some((passive) => passive.kind === 'coordination.stressBearer');
    })?.defId;
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

  private usageKey(skillId: string, usage: { scope: 'round' | 'game'; key?: string }): string {
    const suffix = usage.key ?? 'default';
    return usage.scope === 'round' ? `${skillId}:${suffix}:round:${this.engine.state.round}` : `${skillId}:${suffix}:game`;
  }

  private canUse(memberId: string, skillId: string, usage: { scope: 'round' | 'game'; key?: string; limit: number }): boolean {
    const teamId = this.engine.findMemberTeam(memberId);
    const member = teamId ? this.engine.getCharacter(teamId, memberId) : undefined;
    return !!member && (member.skillUsage[this.usageKey(skillId, usage)] ?? 0) < usage.limit;
  }

  private markUsed(memberId: string, skillId: string, usage: { scope: 'round' | 'game'; key?: string; limit: number }): void {
    const teamId = this.engine.findMemberTeam(memberId);
    const member = teamId ? this.engine.getCharacter(teamId, memberId) : undefined;
    if (!member) return;
    const key = this.usageKey(skillId, usage);
    member.skillUsage[key] = (member.skillUsage[key] ?? 0) + 1;
  }

  private validateActiveTarget(teamId: 'player' | 'enemy', memberId: string, skill: SkillDefinition, target: SkillActivationTarget): boolean {
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
      if (!target.sourceDieId || !target.targetDieId) return false;
      const team = this.engine.getTeam(teamId);
      const source = team.pendingDice.find((die) => die.id === target.sourceDieId);
      const destination = team.pendingDice.find((die) => die.id === target.targetDieId);
      return !!source && !!destination && source.ownerId !== memberId && destination.ownerId === memberId;
    }
    if (!target.targetDieId) return false;
    const ownerTeam = this.engine.getTeam(teamId);
    const enemyTeam = this.engine.getTeam(this.engine.opponentId(teamId));
    const ownDie = ownerTeam.pendingDice.find((die) => die.id === target.targetDieId);
    const enemyDie = enemyTeam.pendingDice.find((die) => die.id === target.targetDieId);
    if (spec.relation === 'enemy') return !!enemyDie;
    if (!ownDie) return false;
    if (spec.relation === 'self') return ownDie.ownerId === memberId;
    if (spec.relation === 'otherAlly') return ownDie.ownerId !== memberId;
    return true;
  }
}
