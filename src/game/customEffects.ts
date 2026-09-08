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
