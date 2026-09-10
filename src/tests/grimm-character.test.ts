import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['grimm', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('格林 complete character package', () => {
  it('keeps calibrated values and production assets together', () => {
    expect(CHARACTERS.grimm?.stats).toEqual({ design: 1, text: 2, aa: 3 });
    expect(CHARACTERS.grimm?.maxStress).toBe(3);
    expect(CHARACTERS.grimm?.affinities).toEqual(['情', '燃', '笑']);
    expect(CHARACTERS.grimm?.tags).toEqual(expect.arrayContaining(['leader', 'visual-storyteller']));
    expect(CHARACTERS.grimm?.portrait).toBe('/assets/characters/portrait/grimm.webp');
    expect(CHARACTERS.grimm?.compactPortrait).toBe('/assets/characters/compact/grimm.webp');
    expect(SKILLS.grimmBurningFrame?.status).toBe('implemented');
  });

  it('燃燒畫面 spends stress to add 2 to a selected AA die', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.5);
    const die = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false, 4)[0]!;
    die.value = 4;

    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', { targetDieId: die.id })).toBe(true);
    expect(die.value).toBe(6);
    expect(engine.getCharacter('player', 'grimm')?.stress).toBe(1);
  });
});