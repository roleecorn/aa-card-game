import type { CardDefinition } from './schema';
import type { SkillActivationTarget, TeamState } from './types';
import type { EngineSession } from './engine';
import { isCardEffectBlocked } from './externalImmunity';

export type CardHandler = (
  team: TeamState,
  card: CardDefinition,
  target: SkillActivationTarget,
  engine: EngineSession,
) => boolean;

const handlers = new Map<string, CardHandler>();

export function registerCardHandler(name: string, handler: CardHandler): void {
  handlers.set(name, handler);
}

export function hasCardHandler(name: string): boolean {
  return handlers.has(name);
}

export function executeCardHandler(name: string, team: TeamState, card: CardDefinition, target: SkillActivationTarget, engine: EngineSession): boolean {
  const handler = handlers.get(name);
  if (!handler) {
    engine.log(`卡牌系統：找不到 custom handler「${name}」。`);
    return false;
  }
  return handler(team, card, target, engine);
}

registerCardHandler('oneOnOne', (team, _card, target, engine) => {
  const member = team.members.find((item) => item.defId === target.memberId);
  const skill = target.skill;
  if (!member || !skill) return false;
  if (isCardEffectBlocked(engine, member.defId)) return true;
  engine.grantDice(team.id, member.defId, skill, 3, '一對一討論', true);
  return true;
});

registerCardHandler('guide', (team, _card, target, engine) => {
  const member = team.members.find((item) => item.defId === target.memberId);
  const skill = target.skill;
  if (!member || !skill) return false;
  const current = engine.getEffectiveStat(member.defId, skill);
  if (current > 1) return false;
  if (isCardEffectBlocked(engine, member.defId)) return true;
  const die = engine.grantDice(team.id, member.defId, skill, 1, '指導', true)[0];
  engine.adjustStress(team.id, member.defId, 1, '指導', true, team.leaderId);
  const threshold = 5 + current;
  if (die && die.value >= threshold) {
    member.permanentStats[skill] += 1;
    engine.log(`「指導」擲出 ${die.value}：${engine.getDefinition(member.defId).name} 的 ${skill.toUpperCase()} 永久 +1。`);
  }
  return true;
});

registerCardHandler('polish', (team, _card, target, engine) => {
  if (target.polishMode === 'pending') {
    const candidates = [...team.pendingDice].sort((a, b) => a.value - b.value).slice(0, 3);
    if (!candidates.length) return false;
    for (const die of candidates) {
      if (isCardEffectBlocked(engine, die.ownerId)) continue;
      const rerolled = engine.rollDieFor(die.ownerId);
      if (rerolled === undefined) {
        team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
      } else {
        die.value = rerolled;
      }
    }
    return true;
  }

  if (target.polishMode !== 'work' || !target.workId) return false;
  const work = team.works.find((candidate) => candidate.id === target.workId);
  if (!work) return false;
  const cells = work.slots.flatMap((slot) => (['design', 'text', 'aa'] as const).flatMap((skill) =>
    slot[skill] === undefined ? [] : [{ slot, skill, value: slot[skill]! }]));
  cells.sort((a, b) => a.value - b.value);
  const chosen = cells.slice(0, 3);
  if (!chosen.length) return false;
  if (isCardEffectBlocked(engine, work.ownerId)) return true;
  for (const cell of chosen) {
    const rerolled = engine.rollDieFor(work.ownerId);
    if (rerolled === undefined) delete cell.slot[cell.skill];
    else cell.slot[cell.skill] = rerolled;
  }
  return true;
});

registerCardHandler('rush', (team, _card, target, engine) => {
  if (!target.workId) return false;
  const work = team.works.find((candidate) => candidate.id === target.workId);
  if (!work) return false;
  if (isCardEffectBlocked(engine, work.ownerId)) return true;
  let filled = 0;
  for (const skill of ['design', 'text', 'aa'] as const) {
    const empty = work.slots.filter((slot) => slot[skill] === undefined).slice(0, engine.state.round);
    for (const slot of empty) {
      slot[skill] = 1;
      filled += 1;
    }
  }
  return filled > 0;
});

registerCardHandler('voice', (team, _card, target, engine) => {
  const mode = target.voiceMode ?? 'relief';
  const affectedMembers = team.members.filter((member) => !isCardEffectBlocked(engine, member.defId));
  if (mode === 'relief') {
    for (const member of affectedMembers) engine.adjustStress(team.id, member.defId, -1, '語音會議');
    return true;
  }
  for (const member of affectedMembers) engine.grantDice(team.id, member.defId, mode, 1, '語音會議', true);
  return true;
});
