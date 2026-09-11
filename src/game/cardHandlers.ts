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

export function executeCardHandler(name: string, team: TeamState, card: CardDefinition, target: SkillActivationTarget, engine: EngineSession): boolean {
  const handler = handlers.get(name);
  if (!handler) {
    engine.log(`卡牌系統：找不到 custom handler「${name}」。`);
    return false;
  }
  return handler(team, card, target, engine);
}

registerCardHandler('guide', (team, _card, target, engine) => {
  const member = team.members.find((item) => item.defId === target.memberId);
  const skill = target.skill;
  if (!member || !skill || engine.getEffectiveStat(member.defId, skill) > 1) return false;
  if (isCardEffectBlocked(engine, member.defId)) return true;
  const die = engine.grantDice(team.id, member.defId, skill, 1, '指導', true)[0];
  if (die?.value === 6) {
    member.permanentStats[skill] += 1;
    engine.log(`「指導」擲出 6：${engine.getDefinition(member.defId).name} 的 ${skill.toUpperCase()} 永久 +1。`);
  }
  return !!die;
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
