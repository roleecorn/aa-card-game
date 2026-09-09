import { describe, expect, it, vi } from 'vitest';
import { createInitialGame, EngineSession } from '../game/engine';
import { DEFAULT_CONTENT } from '../content/catalog';

function fixedRng(value: number) {
  return () => value;
}

describe('blocking-safety guards', () => {
  it('disables target-dependent active skills when no legal target exists', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
      playerMemberIds: ['triangle', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));

    expect(engine.canUseActiveSkill('triangle', 'triangleRecovery')).toBe(false);

    const otherTriangleGame = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
      playerMemberIds: ['triangle', 'avocado', 'pintbox'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const otherTriangleEngine = new EngineSession(otherTriangleGame, fixedRng(0.5));
    expect(otherTriangleEngine.canUseActiveSkill('triangle', 'triangleRecovery')).toBe(true);
  });

  it('only enables copy-die skills when both source and destination dice exist', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
      playerMemberIds: ['mashiro', 'pintbox', 'user79'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));

    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(false);
    engine.grantDice('player', 'mashiro', 'design', 1, 'test', false);
    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(false);
    engine.grantDice('player', 'pintbox', 'design', 1, 'test', false);
    expect(engine.canUseActiveSkill('mashiro', 'mashiroSynthesis')).toBe(true);
  });

  it('disables no-target dice modifiers until a matching die exists', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
      playerMemberIds: ['emotion', 'lemon', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));

    expect(engine.canUseActiveSkill('emotion', 'emotionCraftAwareness')).toBe(false);
    engine.grantDice('player', 'emotion', 'aa', 1, 'test', false);
    expect(engine.canUseActiveSkill('emotion', 'emotionCraftAwareness')).toBe(true);
  });

  it('disables conditional no-target skills until their work condition is met', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
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
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
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
});
