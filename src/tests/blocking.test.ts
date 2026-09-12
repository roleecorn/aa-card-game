import { describe, expect, it, vi } from 'vitest';
import { createInitialGame, EngineSession } from '../game/engine';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { builtInEffects } from '../game/effectRegistry';

function fixedRng(value: number) {
  return () => value;
}

describe('blocking-safety guards', () => {
  it('disables target-dependent active skills when no legal target exists', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['triangle', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));

    expect(engine.canUseActiveSkill('triangle', 'triangleRecovery')).toBe(false);

    const otherTriangleGame = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['triangle', 'avocado', 'pintbox'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const otherTriangleEngine = new EngineSession(otherTriangleGame, fixedRng(0.5));
    expect(otherTriangleEngine.canUseActiveSkill('triangle', 'triangleRecovery')).toBe(true);
  });

  it('only enables copy-die skills when a source and destination can produce a change', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['mashiro', 'pintbox', 'user79'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));

    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(false);
    engine.grantDice('player', 'mashiro', 'design', 1, 'test', false, 4);
    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(false);
    engine.grantDice('player', 'pintbox', 'design', 1, 'test', false, 4);
    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(false);
    engine.grantDice('player', 'pintbox', 'design', 1, 'test', false, 5);
    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(true);
  });

  it('disables no-target dice modifiers until a matching die exists', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['emotion', 'lemon', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));

    expect(engine.canUseActiveSkill('emotion', 'emotionCraftAwareness')).toBe(false);
    engine.grantDice('player', 'emotion', 'aa', 1, 'test', false);
    expect(engine.canUseActiveSkill('emotion', 'emotionCraftAwareness')).toBe(true);
  });

  it('disables conditional no-target skills until their work condition is met', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['meteor', 'lemon', 'emotion'],
      enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    const work = game.player.works.find((item) => item.ownerId === 'meteor')!;

    work.type = '謀';
    expect(engine.canUseActiveSkill('meteor', 'meteorTrack')).toBe(false);
    work.type = '燃';
    expect(engine.canUseActiveSkill('meteor', 'meteorTrack')).toBe(true);
  });

  it('continues to the next round when one enemy runtime trigger throws', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    game.phase = 'player-assign';

    const originalEmit = engine.skills.emit.bind(engine.skills);
    let injected = false;
    vi.spyOn(engine.skills, 'emit').mockImplementation((event) => {
      if (!injected && event.type === 'afterRollBatch' && event.teamId === 'enemy') {
        injected = true;
        throw new Error('simulated enemy trigger failure');
      }
      return originalEmit(event);
    });

    engine.finishPlayerAssignment();

    expect(game.round).toBe(2);
    expect(game.phase).toBe('player-plan');
    expect(game.logs.some((entry) => entry.text.includes('系統保護'))).toBe(true);
  });

  it('isolates an opponent defensive trigger failure during a player card effect', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['mashiro', 'user79', 'lemon'],
      enemyMemberIds: ['pintbox', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    const overtime = game.player.hand.find((item) => item.cardId === 'overtime');
    if (!overtime) {
      engine.addCard('player', 'overtime', 1);
    }
    const instance = game.player.hand.find((item) => item.cardId === 'overtime')!;

    const originalExecute = builtInEffects.execute.bind(builtInEffects);
    const executeSpy = vi.spyOn(builtInEffects, 'execute').mockImplementation((effect, context, currentEngine) => {
      if (context.ownerTeamId === 'enemy' && context.definition.id === 'pintboxAI') {
        throw new Error('simulated opponent defensive trigger failure');
      }
      return originalExecute(effect as never, context, currentEngine);
    });

    expect(() => engine.playCard('player', instance.instanceId, { memberId: 'pintbox' })).not.toThrow();
    expect(game.player.hand.some((item) => item.instanceId === instance.instanceId)).toBe(false);
    expect(game.logs.some((entry) => entry.text.includes('Pintbox') || entry.text.includes('觸發失敗'))).toBe(true);

    executeSpy.mockRestore();
  });

  it('isolates a player defensive trigger failure caused by an opponent effect', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: ['lemon', 'meteor', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.addCard('enemy', 'overtime', 1);
    const instance = game.enemy.hand.find((item) => item.cardId === 'overtime')!;

    const originalExecute = builtInEffects.execute.bind(builtInEffects);
    const executeSpy = vi.spyOn(builtInEffects, 'execute').mockImplementation((effect, context, currentEngine) => {
      if (context.ownerTeamId === 'player' && context.definition.id === 'pintboxAI') {
        throw new Error('simulated player defensive trigger failure');
      }
      return originalExecute(effect as never, context, currentEngine);
    });

    expect(() => engine.playCard('enemy', instance.instanceId, { memberId: 'pintbox' })).not.toThrow();
    expect(game.enemy.hand.some((item) => item.instanceId === instance.instanceId)).toBe(false);
    expect(game.logs.some((entry) => entry.text.includes('效果執行失敗') && entry.text.includes('AI'))).toBe(true);

    executeSpy.mockRestore();
  });

  it('never lets trigger discovery errors escape an emitted opponent event', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: ['lemon', 'meteor', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    const originalGetDefinition = engine.getDefinition.bind(engine);
    let injected = false;

    vi.spyOn(engine, 'getDefinition').mockImplementation((memberId) => {
      if (!injected && memberId === 'lemon') {
        injected = true;
        throw new Error('simulated opponent trigger discovery failure');
      }
      return originalGetDefinition(memberId);
    });

    expect(() => engine.skills.emit({
      type: 'afterExternalStress',
      teamId: 'enemy',
      targetId: 'lemon',
      amount: 1,
    })).not.toThrow();
    expect(game.logs.some((entry) => entry.text.includes('技能事件') && entry.text.includes('已隔離'))).toBe(true);
  });

});
