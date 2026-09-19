import type { SkillEffect, SkillStat } from './schema';
import type { DieToken, EffectContext } from './types';
import type { EngineSession } from './engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from './statuses';

export type CustomEffect = Extract<SkillEffect, { kind: 'custom' }>;
export type CustomEffectHandler = (effect: CustomEffect, context: EffectContext, engine: EngineSession) => boolean;

const handlers = new Map<string, CustomEffectHandler>();
const SKILLS: SkillStat[] = ['design', 'text', 'aa'];

export function registerCustomSkillEffect(name: string, handler: CustomEffectHandler): void {
  if (handlers.has(name)) throw new Error(`Duplicate custom skill effect registration: ${name}`);
  handlers.set(name, handler);
}

export function hasCustomSkillEffect(name: string): boolean {
  return handlers.has(name);
}

export function executeCustomSkillEffect(effect: CustomEffect, context: EffectContext, engine: EngineSession): boolean {
  const handler = handlers.get(effect.handler);
  if (!handler) {
    engine.log(`技能系統：找不到 custom handler「${effect.handler}」。`);
    return false;
  }
  return handler(effect, context, engine);
}

function ownerWork(context: EffectContext, engine: EngineSession) {
  return engine.getTeam(context.ownerTeamId).works.find((candidate) => candidate.ownerId === context.ownerId);
}

function fillOwnerRemainingRandom(context: EffectContext, engine: EngineSession): number {
  const work = ownerWork(context, engine);
  if (!work) return 0;
  let filled = 0;
  for (const slot of work.slots) {
    for (const skill of SKILLS) {
      if (slot[skill] !== undefined) continue;
      slot[skill] = engine.randomDie();
      filled += 1;
    }
  }
  return filled;
}

function hideOwner(context: EffectContext, engine: EngineSession, rounds?: number): boolean {
  const member = engine.getCharacter(context.ownerTeamId, context.ownerId);
  if (!member || hasGameplayStatus(member, GAMEPLAY_STATUS.hidden)) return false;

  member.statuses[GAMEPLAY_STATUS.hidden] = {
    stacks: 1,
    expiresAfterRound: rounds && rounds > 0 ? engine.state.round + Math.floor(rounds) - 1 : undefined,
  };
  const team = engine.getTeam(context.ownerTeamId);
  team.pendingDice = team.pendingDice.filter((die) => die.ownerId !== context.ownerId);
  context.event.dice?.splice(0);
  engine.log(`${engine.getDefinition(context.ownerId).name} 神隱，期間不能行動或成為卡牌目標。`);
  engine.skills.emit({
    type: 'activeSkill',
    teamId: context.ownerTeamId,
    actorId: context.ownerId,
    targetId: context.ownerId,
    metadata: { hiddenEvent: true },
  });
  return true;
}

registerCustomSkillEffect('addRandomCardsByKind', (effect, context, engine) => {
  const cardKind = effect.args?.cardKind;
  const countArg = effect.args?.count;
  if ((cardKind !== 'coordination' && cardKind !== 'event') || typeof countArg !== 'number') return false;

  const pool = Object.values(engine.content.cards).filter((card) => card.kind === cardKind);
  const count = Math.max(0, Math.floor(countArg));
  if (!pool.length || count <= 0) return false;

  for (let i = 0; i < count; i += 1) {
    const card = pool[Math.floor(engine.random() * pool.length)];
    if (!card) continue;
    engine.addCard(context.ownerTeamId, card.id, 1);
  }
  engine.log(`${context.definition.name}：額外取得 ${count} 張${cardKind === 'coordination' ? '統籌' : '事件'}卡。`);
  return true;
});

registerCustomSkillEffect('changeOwnerResource', (effect, context, engine) => {
  const resource = effect.args?.resource;
  const amount = effect.args?.amount;
  if (typeof resource !== 'string' || typeof amount !== 'number') return false;
  return engine.adjustResource(context.ownerTeamId, context.ownerId, resource, amount);
});

registerCustomSkillEffect('fillOwnerWorkRemainingRandom', (_effect, context, engine) => {
  const filled = fillOwnerRemainingRandom(context, engine);
  if (filled > 0) engine.log(`${context.definition.name}：以 ${filled} 次獨立 1d6 填滿剩餘進度。`);
  return filled > 0;
});

registerCustomSkillEffect('removeEventDiceAtOrBelow', (effect, context, engine) => {
  const maxValue = effect.args?.maxValue;
  const dice = context.event.dice;
  if (typeof maxValue !== 'number' || !dice?.length) return false;

  const kept = dice.filter((die) => die.value > maxValue);
  const removed = dice.length - kept.length;
  if (removed <= 0) return false;

  dice.splice(0, dice.length, ...kept);
  engine.log(`${context.definition.name}：${removed} 顆點數 ${maxValue} 以下的骰無法使用。`);
  return true;
});

registerCustomSkillEffect('rollOwnerDiceAndKeepAtLeast', (effect, context, engine) => {
  const designCount = effect.args?.designCount;
  const textCount = effect.args?.textCount;
  const minValue = effect.args?.minValue;
  if (typeof designCount !== 'number' || typeof textCount !== 'number' || typeof minValue !== 'number') return false;
  if (!engine.getCharacter(context.ownerTeamId, context.ownerId)) return false;

  const team = engine.getTeam(context.ownerTeamId);
  let retainedTotal = 0;
  for (const [skill, rawCount] of [['design', designCount], ['text', textCount]] as const) {
    const count = Math.max(0, Math.floor(rawCount));
    const rolled = Array.from({ length: count }, () => engine.rollDieFor(context.ownerId))
      .filter((value): value is NonNullable<typeof value> => value !== undefined);
    const retained = rolled
      .filter((value) => value >= minValue)
      .map((value) => ({
        id: engine.uid('die'),
        ownerId: context.ownerId,
        skill,
        value,
        round: engine.state.round,
        origin: context.definition.name,
      }));

    if (retained.length) {
      team.pendingDice.push(...retained);
      engine.skills.emit({
        type: 'afterDiceGranted',
        teamId: context.ownerTeamId,
        targetId: context.ownerId,
        skill,
        amount: retained.length,
        dice: retained,
        sourceKind: 'skill-or-card',
        metadata: { extra: true },
      });
      retainedTotal += retained.length;
    }
    engine.log(`${context.definition.name}：${skill === 'design' ? 'Design' : 'Text'} 擲出 ${rolled.join('、')}，保留 ${retained.map((die) => die.value).join('、') || '無'}。`);
  }
  return retainedTotal > 0;
});

function departOwner(context: EffectContext, engine: EngineSession): boolean {
  context.event.dice?.splice(0);
  return engine.departCharacter(context.ownerTeamId, context.ownerId, context.definition.name);
}

registerCustomSkillEffect('departOwner', (_effect, context, engine) => departOwner(context, engine));

registerCustomSkillEffect('departOwnerIfAtStressCap', (_effect, context, engine) => {
  if (!engine.isAtStressCap(context.ownerTeamId, context.ownerId)) return false;
  return departOwner(context, engine);
});

registerCustomSkillEffect('departOwnerIfWorkWouldReachStressCap', (_effect, context, engine) => {
  const member = engine.getCharacter(context.ownerTeamId, context.ownerId);
  const maxStress = engine.getEffectiveMaxStress(context.ownerTeamId, context.ownerId);
  if (!member || maxStress === null || maxStress === undefined || member.stress + 1 < maxStress) return false;

  const amountToCap = Math.max(0, maxStress - member.stress);
  if (amountToCap > 0) engine.adjustStress(context.ownerTeamId, context.ownerId, amountToCap, '工作');
  return departOwner(context, engine);
});

registerCustomSkillEffect('grantOwnerDesignIfActorLeaderDesignAtLeast', (effect, context, engine) => {
  const minValue = effect.args?.minValue;
  if (typeof minValue !== 'number') return false;
  const team = engine.getTeam(context.ownerTeamId);
  if (!context.event.actorId || context.event.actorId !== team.leaderId || context.ownerId === team.leaderId) return false;
  if (!context.event.dice?.some((die) => die.skill === 'design' && die.value >= minValue)) return false;

  const value = engine.rollDieFor(context.ownerId);
  if (value === undefined) return false;
  const die: DieToken = {
    id: engine.uid('die'),
    ownerId: context.ownerId,
    skill: 'design',
    value,
    round: engine.state.round,
    origin: context.definition.name,
  };
  team.pendingDice.push(die);
  engine.skills.emit({
    type: 'afterDiceGranted',
    teamId: context.ownerTeamId,
    targetId: context.ownerId,
    skill: 'design',
    amount: 1,
    dice: [die],
    sourceKind: 'skill-or-card',
    metadata: { extra: true },
  });
  engine.log(`${context.definition.name}：Leader 的 Design 骰達標，額外取得 1 顆 Design 骰。`);
  return true;
});

registerCustomSkillEffect('tradeSelectedOwnerTextForDesign', (_effect, context, engine) => {
  const dieId = context.activationTarget?.targetDieId;
  if (!dieId) return false;
  const team = engine.getTeam(context.ownerTeamId);
  const die = team.pendingDice.find((candidate) => candidate.id === dieId);
  if (!die || die.ownerId !== context.ownerId || die.skill !== 'text') return false;

  team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== dieId);
  engine.grantDice(context.ownerTeamId, context.ownerId, 'design', 1, context.definition.name, true);
  engine.log(`${context.definition.name}：消耗 1 顆 Text 骰，換取 1 顆額外 Design 骰。`);
  return true;
});

registerCustomSkillEffect('grantOwnerRescueDice', (_effect, context, engine) => {
  let granted = 0;
  for (const skill of SKILLS) {
    const die = engine.grantDice(context.ownerTeamId, context.ownerId, skill, 1, context.definition.name, true)[0];
    if (!die) continue;
    die.placement = 'anyAllyWork';
    granted += 1;
  }
  return granted > 0;
});

registerCustomSkillEffect('grimmLoveForTonelico', (_effect, context, engine) => {
  const workId = context.activationTarget?.workId;
  const progressTarget = context.activationTarget?.targetDieId;
  if (!workId || !progressTarget) return false;

  const team = engine.getTeam(context.ownerTeamId);
  const work = team.works.find((candidate) => candidate.id === workId && candidate.ownerId === context.ownerId);
  if (!work || work.type !== '情') return false;

  const [slotText, skillText] = progressTarget.split(':');
  const slotIndex = Number(slotText);
  if (!Number.isInteger(slotIndex) || !SKILLS.includes(skillText as SkillStat)) return false;
  const skill = skillText as SkillStat;
  const slot = work.slots[slotIndex];
  if (!slot || slot[skill] === undefined) return false;

  const before = slot[skill];
  slot[skill] = 3;
  engine.log(`${context.definition.name}：${work.title} 第 ${slotIndex + 1} 格 ${skill.toUpperCase()} ${before} → 3。`);
  engine.adjustStress(context.ownerTeamId, context.ownerId, -1, context.definition.name);
  return true;
});

registerCustomSkillEffect('normalizeForbiddenEventDice', (effect, context, engine) => {
  const dice = context.event.dice;
  const rawValues = effect.args?.values;
  const rawSkills = effect.args?.skills;
  if (!dice?.length || !Array.isArray(rawValues)) return false;
  const localForbidden = new Set(rawValues.filter((value): value is number => typeof value === 'number'));
  const restrictedSkills = Array.isArray(rawSkills)
    ? new Set(rawSkills.filter((skill): skill is SkillStat => SKILLS.includes(skill as SkillStat)))
    : undefined;
  let changed = false;

  for (const die of [...dice]) {
    if (restrictedSkills && !restrictedSkills.has(die.skill)) continue;
    if (!localForbidden.has(die.value)) continue;
    const original = die.value;
    const globalForbidden = engine.skills.getForbiddenRollFaces(die.ownerId);
    const allowed = ([1, 2, 3, 4, 5, 6] as const)
      .filter((value) => !localForbidden.has(value) && !globalForbidden.has(value));
    if (!allowed.length) {
      dice.splice(0, dice.length, ...dice.filter((candidate) => candidate.id !== die.id));
      for (const teamId of ['player', 'enemy'] as const) {
        const team = engine.getTeam(teamId);
        team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
      }
      engine.log(`${context.definition.name}：骰子因沒有任何合法骰面而消失。`);
      changed = true;
      continue;
    }

    let next = engine.rollDieFor(die.ownerId);
    let attempts = 1;
    while (next !== undefined && localForbidden.has(next) && attempts < 20) {
      next = engine.rollDieFor(die.ownerId);
      attempts += 1;
    }
    if (next === undefined) {
      dice.splice(0, dice.length, ...dice.filter((candidate) => candidate.id !== die.id));
      changed = true;
      continue;
    }
    if (localForbidden.has(next)) {
      next = allowed.sort((a, b) => Math.abs(a - original) - Math.abs(b - original))[0]!;
    }
    die.value = engine.asDieValue(next);
    changed = true;
  }
  return changed;
});

registerCustomSkillEffect('rerollOwnerLowestPending', (effect, context, engine) => {
  const countArg = effect.args?.count;
  const count = typeof countArg === 'number' ? Math.max(1, Math.floor(countArg)) : 1;
  const dice = engine.getTeam(context.ownerTeamId).pendingDice
    .filter((die) => die.ownerId === context.ownerId)
    .sort((a, b) => a.value - b.value)
    .slice(0, count);
  if (!dice.length) return false;
  const team = engine.getTeam(context.ownerTeamId);
  for (const die of dice) {
    const rerolled = engine.rollDieFor(context.ownerId);
    if (rerolled === undefined) {
      team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
      continue;
    }
    die.value = rerolled;
  }
  return true;
});

registerCustomSkillEffect('rerollSelectedOwnerDieIfWorkType', (effect, context, engine) => {
  const workType = effect.args?.workType;
  const dieId = context.activationTarget?.targetDieId;
  const work = ownerWork(context, engine);
  if (typeof workType !== 'string' || !dieId || !work || work.type !== workType) return false;
  const die = engine.getTeam(context.ownerTeamId).pendingDice.find((candidate) => candidate.id === dieId && candidate.ownerId === context.ownerId);
  if (!die) return false;
  const rerolled = engine.rollDieFor(context.ownerId);
  if (rerolled === undefined) {
    const team = engine.getTeam(context.ownerTeamId);
    team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
    return true;
  }
  die.value = rerolled;
  return true;
});

registerCustomSkillEffect('rerollOwnerWorkProgress', (effect, context, engine) => {
  const rawSkill = effect.args?.skill;
  const skill = SKILLS.includes(rawSkill as SkillStat) ? rawSkill as SkillStat : undefined;
  const work = ownerWork(context, engine);
  if (!work) return false;
  let changed = 0;
  for (const slot of work.slots) {
    for (const currentSkill of SKILLS) {
      if (skill && currentSkill !== skill) continue;
      if (slot[currentSkill] === undefined) continue;
      slot[currentSkill] = engine.randomDie();
      changed += 1;
    }
  }
  return changed > 0;
});

registerCustomSkillEffect('grantOwnerFixedDice', (effect, context, engine) => {
  const rawSkill = effect.args?.skill;
  const values = effect.args?.values;
  if (!SKILLS.includes(rawSkill as SkillStat) || !Array.isArray(values)) return false;
  const skill = rawSkill as SkillStat;
  const dice: DieToken[] = values
    .filter((value): value is number => typeof value === 'number')
    .map((value) => ({
      id: engine.uid('die'), ownerId: context.ownerId, skill, value: engine.asDieValue(value),
      round: engine.state.round, origin: context.definition.name,
    }));
  if (!dice.length) return false;
  engine.getTeam(context.ownerTeamId).pendingDice.push(...dice);
  engine.skills.emit({ type: 'afterDiceGranted', teamId: context.ownerTeamId, targetId: context.ownerId,
    skill, amount: dice.length, dice, sourceKind: 'skill-or-card', metadata: { extra: true } });
  return true;
});

registerCustomSkillEffect('fillOwnerWorkFixedProgress', (effect, context, engine) => {
  const rawSkill = effect.args?.skill;
  const value = effect.args?.value;
  const work = ownerWork(context, engine);
  if (!work || !SKILLS.includes(rawSkill as SkillStat) || typeof value !== 'number') return false;
  const skill = rawSkill as SkillStat;
  const slot = work.slots.find((candidate) => candidate[skill] === undefined);
  if (!slot) return false;
  slot[skill] = engine.asDieValue(value);
  return true;
});

registerCustomSkillEffect('clearIncompleteOwnerSlots', (_effect, context, engine) => {
  const work = ownerWork(context, engine);
  if (!work) return false;
  let cleared = 0;
  work.slots = work.slots.map((slot) => {
    if (slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined) return slot;
    if (slot.design !== undefined || slot.text !== undefined || slot.aa !== undefined) cleared += 1;
    return {};
  });
  return cleared > 0;
});

registerCustomSkillEffect('fillOwnerWorkSkills', (effect, context, engine) => {
  const rawSkills = effect.args?.skills;
  const value = effect.args?.value;
  const work = ownerWork(context, engine);
  if (!work || !Array.isArray(rawSkills) || typeof value !== 'number') return false;
  const skills = rawSkills.filter((skill): skill is SkillStat => SKILLS.includes(skill as SkillStat));
  let filled = 0;
  for (const slot of work.slots) {
    for (const skill of skills) {
      if (slot[skill] !== undefined) continue;
      slot[skill] = engine.asDieValue(value);
      filled += 1;
    }
  }
  return filled > 0;
});

registerCustomSkillEffect('splitSelectedOwnerDie', (_effect, context, engine) => {
  const dieId = context.activationTarget?.targetDieId;
  const team = engine.getTeam(context.ownerTeamId);
  const source = team.pendingDice.find((die) => die.id === dieId && die.ownerId === context.ownerId);
  if (!source) return false;
  team.pendingDice = team.pendingDice.filter((die) => die.id !== source.id);
  const dice: DieToken[] = Array.from({ length: source.value }, () => ({
    id: engine.uid('die'), ownerId: context.ownerId, skill: source.skill, value: 1,
    round: engine.state.round, origin: context.definition.name,
  }));
  team.pendingDice.push(...dice);
  engine.skills.emit({ type: 'afterDiceGranted', teamId: context.ownerTeamId, targetId: context.ownerId,
    skill: source.skill, amount: dice.length, dice, sourceKind: 'skill-or-card', metadata: { extra: true } });
  return true;
});

registerCustomSkillEffect('convertSelectedOwnerDie', (effect, context, engine) => {
  const dieId = context.activationTarget?.targetDieId;
  const toSkill = effect.args?.toSkill;
  if (!dieId || !SKILLS.includes(toSkill as SkillStat)) return false;
  const die = engine.getTeam(context.ownerTeamId).pendingDice.find((candidate) => candidate.id === dieId && candidate.ownerId === context.ownerId);
  if (!die) return false;
  die.skill = toSkill as SkillStat;
  return true;
});

registerCustomSkillEffect('adaoFlashbackStress', (_effect, context, engine) => {
  if (context.event.actorId !== context.ownerId || !context.event.workId) return false;
  const work = engine.getTeam(context.ownerTeamId).works.find((candidate) => candidate.id === context.event.workId);
  if (!work || work.ownerId !== context.ownerId) return false;
  const slotIndex = context.event.metadata?.slotIndex;
  if (typeof slotIndex !== 'number' || (slotIndex !== 3 && slotIndex !== 4)) return false;
  engine.adjustStress(context.ownerTeamId, context.ownerId, 1, context.definition.name);
  return true;
});

registerCustomSkillEffect('adaoAdjustLength', (effect, context, engine) => {
  const amount = effect.args?.amount;
  const workId = context.activationTarget?.workId;
  const member = engine.getCharacter(context.ownerTeamId, context.ownerId);
  if (typeof amount !== 'number' || !workId || !member) return false;
  const key = 'adaoAdjustLength:game';
  if ((member.skillUsage[key] ?? 0) >= 2) return false;
  const work = engine.getTeam(context.ownerTeamId).works.find((candidate) => candidate.id === workId && candidate.ownerId === context.ownerId);
  if (!work) return false;
  const before = work.length;
  engine.resizeWork(work, amount, 1);
  if (work.length === before) return false;
  member.skillUsage[key] = (member.skillUsage[key] ?? 0) + 1;
  return true;
});

registerCustomSkillEffect('orangeangelResonanceIfNeeded', (effect, context, engine) => {
  const member = engine.getCharacter(context.ownerTeamId, context.ownerId);
  if (!member) return false;
  const key = 'orangeangelResonance:game';
  if ((member.skillUsage[key] ?? 0) > 0) return false;
  const projected = typeof effect.args?.projectedStress === 'number' ? effect.args.projectedStress : 0;
  if (member.stress + projected < 3) return false;
  const work = ownerWork(context, engine);
  if (!work) return false;
  const filled = fillOwnerRemainingRandom(context, engine);
  work.type = '怪';
  member.skillUsage[key] = 1;
  engine.log(`${engine.getDefinition(context.ownerId).name} 發動「姆咪共鳴」，作品轉為（怪）並補完剩餘進度。`);
  return filled > 0 || true;
});

registerCustomSkillEffect('hideOwner', (effect, context, engine) => {
  const rounds = effect.args?.rounds;
  return hideOwner(context, engine, typeof rounds === 'number' ? rounds : undefined);
});

registerCustomSkillEffect('hideOwnerIfAtStressCap', (_effect, context, engine) => {
  return engine.isAtStressCap(context.ownerTeamId, context.ownerId) ? hideOwner(context, engine) : false;
});

registerCustomSkillEffect('yamadaInternalConflict', (effect, context, engine) => {
  const member = engine.getCharacter(context.ownerTeamId, context.ownerId);
  if (!member || hasGameplayStatus(member, GAMEPLAY_STATUS.hidden)) return false;
  const lowCount = (context.event.dice ?? []).filter((die) => die.value <= 2).length;
  const projectWorkStress = effect.args?.projectWorkStress === true;
  const maxStress = engine.getEffectiveMaxStress(context.ownerTeamId, context.ownerId);
  if (maxStress === undefined || maxStress === null) {
    if (lowCount > 0) engine.adjustStress(context.ownerTeamId, context.ownerId, lowCount, context.definition.name);
    return lowCount > 0;
  }

  if (lowCount > 0) engine.adjustStress(context.ownerTeamId, context.ownerId, lowCount, context.definition.name);
  const current = engine.getCharacter(context.ownerTeamId, context.ownerId);
  if (!current) return lowCount > 0;
  if (current.stress + (projectWorkStress ? 1 : 0) < maxStress) return lowCount > 0;
  if (current.stress < maxStress) engine.adjustStress(context.ownerTeamId, context.ownerId, maxStress - current.stress, context.definition.name);
  return hideOwner(context, engine) || lowCount > 0;
});

registerCustomSkillEffect('enkiTakeCoordinationStress', (_effect, context, engine) => {
  const team = engine.getTeam(context.ownerTeamId);
  if (context.ownerId === team.leaderId) return false;
  const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
  const leader = engine.getCharacter(context.ownerTeamId, team.leaderId);
  if (!owner || !leader || hasGameplayStatus(owner, GAMEPLAY_STATUS.hidden)) return false;
  const leaderBeforeCardStress = Math.max(0, leader.stress - 1);
  if (owner.stress > leaderBeforeCardStress) return false;
  const beforeOwner = owner.stress;
  engine.adjustStress(context.ownerTeamId, team.leaderId, -1, context.definition.name);
  engine.adjustStress(context.ownerTeamId, context.ownerId, 1, context.definition.name);
  return owner.stress !== beforeOwner;
});

registerCustomSkillEffect('grantActingLeaderStressCapIfLeaderHidden', (_effect, context, engine) => {
  const team = engine.getTeam(context.ownerTeamId);
  const leader = engine.getCharacter(context.ownerTeamId, team.leaderId);
  const owner = engine.getCharacter(context.ownerTeamId, context.ownerId);
  if (!leader || !owner || team.leaderId === context.ownerId || !hasGameplayStatus(leader, GAMEPLAY_STATUS.hidden)) return false;
  if ((owner.statuses[GAMEPLAY_STATUS.actingLeaderStressCapBonus]?.stacks ?? 0) >= 2) return false;
  owner.statuses[GAMEPLAY_STATUS.actingLeaderStressCapBonus] = { stacks: 2 };
  return true;
});

registerCustomSkillEffect('chidoriOwlLink', (_effect, context, engine) => {
  const actorId = context.event.actorId;
  const workId = context.event.workId;
  if (!actorId || actorId === context.ownerId || !workId) return false;
  if (engine.findMemberTeam(actorId) !== context.ownerTeamId) return false;
  const work = engine.getTeam(context.ownerTeamId).works.find((candidate) => candidate.id === workId);
  if (!work || work.ownerId !== context.ownerId) return false;
  const actor = engine.getCharacter(context.ownerTeamId, actorId);
  if (!actor || actor.stress <= 0) return false;
  engine.adjustStress(context.ownerTeamId, actorId, -1, context.definition.name);
  return true;
});
