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
