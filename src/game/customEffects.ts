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
