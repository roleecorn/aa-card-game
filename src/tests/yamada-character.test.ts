import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['yamada', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('山田 complete character package', () => {
  it('uses the PintBox-approved stats and implemented skills', () => {
    expect(CHARACTERS.yamada?.stats).toEqual({ design: 0, text: 0, aa: 2 });
    expect(CHARACTERS.yamada?.maxStress).toBe(2);
    expect(CHARACTERS.yamada?.affinities).toEqual([]);
    expect(CHARACTERS.yamada?.portrait).toBe('/assets/characters/portrait/yamada.webp');
    expect(CHARACTERS.yamada?.compactPortrait).toBe('/assets/characters/compact/yamada.webp');
    expect(SKILLS.yamadaSignalJump?.status).toBe('implemented');
    expect(SKILLS.yamadaVanish?.status).toBe('implemented');
  });

  it('keeps only 5 or 6 from the three Design and three Text rolls on round one', () => {
    const game = createInitialGame(() => 0.9, STANDARD_GAME_DEFINITION, ROSTER);
    const dice = game.player.pendingDice.filter((die) => die.ownerId === 'yamada');

    expect(dice).toHaveLength(6);
    expect(dice.filter((die) => die.skill === 'design')).toHaveLength(3);
    expect(dice.filter((die) => die.skill === 'text')).toHaveLength(3);
    expect(dice.every((die) => die.value === 6)).toBe(true);
  });

  it('filters low 電波跳躍 rolls independently', () => {
    const game = createInitialGame(() => 0.9, STANDARD_GAME_DEFINITION, ROSTER);
    game.player.pendingDice = [];
    const sequence = [0, 0.67, 0.99, 0.49, 0.83, 0.16];
    let index = 0;
    const engine = new EngineSession(game, () => sequence[index++] ?? 0, STANDARD_GAME_DEFINITION);

    engine.skills.emit({ type: 'roundStart' });

    const dice = game.player.pendingDice.filter((die) => die.ownerId === 'yamada');
    expect(dice.map((die) => [die.skill, die.value])).toEqual([
      ['design', 5],
      ['design', 6],
      ['text', 5],
    ]);
  });

  it('leaves immediately when external stress reaches the effective leader cap and randomly reassigns leadership', () => {
    const game = createInitialGame(() => 0.9, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.9, STANDARD_GAME_DEFINITION);

    expect(engine.getEffectiveMaxStress('player', 'yamada')).toBe(4);
    engine.adjustStress('player', 'yamada', 4, 'test', true);

    expect(game.player.members.some((member) => member.defId === 'yamada')).toBe(false);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'yamada')).toBe(false);
    expect(game.player.leaderId).toBe('mashiro');
    expect(game.player.works.some((work) => work.ownerId === 'yamada')).toBe(true);
  });

  it('leaves during work when the normal +1 Stress would reach the effective leader cap', () => {
    const game = createInitialGame(() => 0.9, STANDARD_GAME_DEFINITION, ROSTER);
    game.player.pendingDice = [];
    const yamada = game.player.members.find((member) => member.defId === 'yamada')!;
    yamada.stress = 3;
    const engine = new EngineSession(game, () => 0.9, STANDARD_GAME_DEFINITION);

    expect(engine.getEffectiveMaxStress('player', 'yamada')).toBe(4);
    engine.performPlayerActions({ yamada: 'work', pintbox: 'slack', mashiro: 'slack' });

    expect(game.player.members.some((member) => member.defId === 'yamada')).toBe(false);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'yamada')).toBe(false);
  });
});
