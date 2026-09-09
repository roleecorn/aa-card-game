import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['pigeon', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('鴿子的化身 complete character package', () => {
  it('uses PintBox revised stress and source-backed stats', () => {
    expect(CHARACTERS.pigeon?.stats).toEqual({ design: 1, text: 2, aa: 1 });
    expect(CHARACTERS.pigeon?.maxStress).toBe(3);
    expect(CHARACTERS.pigeon?.portrait).toBe('/assets/characters/portrait/pigeon.webp');
    expect(CHARACTERS.pigeon?.compactPortrait).toBe('/assets/characters/compact/pigeon.webp');
    expect(SKILLS.pigeonReaderPerspective?.status).toBe('implemented');
  });

  it('讀者視角 improves one other ally pending die once per round', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.5);
    const die = engine.grantDice('player', 'pintbox', 'text', 1, 'test', false, 4)[0]!;
    die.value = 4;
    expect(engine.activateSkill('player', 'pigeon', 'pigeonReaderPerspective', { targetDieId: die.id })).toBe(true);
    expect(die.value).toBe(5);
    expect(engine.activateSkill('player', 'pigeon', 'pigeonReaderPerspective', { targetDieId: die.id })).toBe(false);
  });
});
