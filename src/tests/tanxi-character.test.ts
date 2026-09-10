import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['tanxi', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('嘆息 complete character package', () => {
  it('keeps calibrated stats and production assets', () => {
    expect(CHARACTERS.tanxi?.stats).toEqual({ design: 1, text: 0, aa: 0 });
    expect(CHARACTERS.tanxi?.maxStress).toBe(3);
    expect(CHARACTERS.tanxi?.portrait).toBe('/assets/characters/portrait/tanxi.webp');
    expect(CHARACTERS.tanxi?.compactPortrait).toBe('/assets/characters/compact/tanxi.webp');
    expect(SKILLS.tanxiHardPush?.status).toBe('implemented');
    expect(SKILLS.tanxiHardToCoordinate?.status).toBe('implemented');
  });

  it('硬憋 spends stress and grants one best-of-two Text die once per round', () => {
    const game = createInitialGame(() => 0.999, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.999);
    const before = game.player.pendingDice.filter((die) => die.ownerId === 'tanxi').length;

    expect(engine.activateSkill('player', 'tanxi', 'tanxiHardPush')).toBe(true);
    const granted = game.player.pendingDice.filter((die) => die.ownerId === 'tanxi').slice(before);
    expect(granted).toHaveLength(1);
    expect(granted[0]?.skill).toBe('text');
    expect(granted[0]?.value).toBe(6);
    expect(engine.getCharacter('player', 'tanxi')?.stress).toBe(1);
    expect(engine.activateSkill('player', 'tanxi', 'tanxiHardPush')).toBe(false);
  });

  it('難以配合 adds stress only once per round when another ally places a die', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.5);
    engine.skills.emit({ type: 'afterDiePlaced', teamId: 'player', actorId: 'pintbox' });
    expect(engine.getCharacter('player', 'tanxi')?.stress).toBe(1);
    engine.skills.emit({ type: 'afterDiePlaced', teamId: 'player', actorId: 'mashiro' });
    expect(engine.getCharacter('player', 'tanxi')?.stress).toBe(1);
  });
});
