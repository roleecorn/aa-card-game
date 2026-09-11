import type { SkillEffect } from './schema';
import type { EffectContext } from './types';
import type { EngineSession } from './engine';

export type CustomEffect = Extract<SkillEffect, { kind: 'custom' }>;
export type CustomEffectHandler = (effect: CustomEffect, context: EffectContext, engine: EngineSession) => boolean;

const handlers = new Map<string, CustomEffectHandler>();

export function registerCustomSkillEffect(name: string, handler: CustomEffectHandler): void {
  handlers.set(name, handler);
}

export function executeCustomSkillEffect(effect: CustomEffect, context: EffectContext, engine: EngineSession): boolean {
  const handler = handlers.get(effect.handler);
  if (!handler) {
    engine.log(`技能系統：找不到 custom handler「${effect.handler}」。`);
    return false;
  }
  return handler(effect, context, engine);
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
  const work = engine.getTeam(context.ownerTeamId).works.find((candidate) => candidate.ownerId === context.ownerId);
  if (!work) return false;

  let filled = 0;
  for (const slot of work.slots) {
    for (const skill of ['design', 'text', 'aa'] as const) {
      if (slot[skill] !== undefined) continue;
      slot[skill] = engine.randomDie();
      filled += 1;
    }
  }

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
    const rolled = Array.from({ length: count }, () => engine.rollDieFor(context.ownerId));
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
  const team = engine.getTeam(context.ownerTeamId);
  const index = team.members.findIndex((member) => member.defId === context.ownerId);
  if (index < 0) return false;

  context.event.dice?.splice(0);
  team.pendingDice = team.pendingDice.filter((die) => die.ownerId !== context.ownerId);
  team.members.splice(index, 1);
  if (team.leaderId === context.ownerId) team.leaderId = team.members[0]?.defId ?? '';
  engine.log(`${engine.getDefinition(context.ownerId).name} 因「神隱」離場，之後不再參與本局。`);
  return true;
}

registerCustomSkillEffect('departOwner', (_effect, context, engine) => departOwner(context, engine));

registerCustomSkillEffect('departOwnerIfWorkWouldReachStressCap', (_effect, context, engine) => {
  const member = engine.getCharacter(context.ownerTeamId, context.ownerId);
  const maxStress = engine.getDefinition(context.ownerId).maxStress;
  if (!member || maxStress === null || member.stress + 1 < maxStress) return false;

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

  const die = {
    id: engine.uid('die'),
    ownerId: context.ownerId,
    skill: 'design' as const,
    value: engine.rollDieFor(context.ownerId),
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
