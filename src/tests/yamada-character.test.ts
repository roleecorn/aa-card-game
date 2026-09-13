import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { GAMEPLAY_STATUS } from '../game/statuses';
import type { DieToken } from '../game/types';

const ROSTER = {
  playerMemberIds: ['yamada', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('山田 complete character package', () => {
  it('uses the latest PintBox-approved stats and implemented skills', () => {
    expect(CHARACTERS.yamada?.stats).toEqual({ design: 1, text: 1, aa: 2 });
    expect(CHARACTERS.yamada?.maxStress).toBe(4);
    expect(CHARACTERS.yamada?.affinities).toEqual(['怪']);
    expect(CHARACTERS.yamada?.portrait).toBe('/assets/characters/portrait/yamada.webp');
    expect(CHARACTERS.yamada?.compactPortrait).toBe('/assets/characters/compact/yamada.webp');
    expect(SKILLS.yamadaRadioJump?.status).toBe('implemented');
    expect(SKILLS.yamadaInternalConflict?.status).toBe('implemented');
    expect(SKILLS.yamadaDisappear?.status).toBe('implemented');
  });

  it('電波跳躍 grants three Design and three Text dice at game start', () => {
    const game = createInitialGame(() => 0.9, STANDARD_GAME_DEFINITION, ROSTER);
    const dice = game.player.pendingDice.filter((die) => die.ownerId === 'yamada' && die.origin === '電波跳躍');

    expect(dice).toHaveLength(6);
    expect(dice.filter((die) => die.skill === 'design')).toHaveLength(3);
    expect(dice.filter((die) => die.skill === 'text')).toHaveLength(3);
  });

  it('內耗 adds one Stress for every rolled 1 or 2', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const yamada = engine.getCharacter('player', 'yamada')!;
    yamada.stress = 0;
    const dice: DieToken[] = [
      { id: 'd1', ownerId: 'yamada', skill: 'design', value: 1, round: 1, origin: 'test' },
      { id: 'd2', ownerId: 'yamada', skill: 'text', value: 2, round: 1, origin: 'test' },
      { id: 'd3', ownerId: 'yamada', skill: 'aa', value: 4, round: 1, origin: 'test' },
    ];

    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'yamada', dice, amount: dice.length, sourceKind: 'work' });

    expect(yamada.stress).toBe(2);
    expect(yamada.statuses[GAMEPLAY_STATUS.hidden]).toBeUndefined();
  });

  it('神隱 keeps 山田 in the roster, clears pending dice, and preserves the original leader identity', () => {
    const game = createInitialGame(() => 0.9, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.9, STANDARD_GAME_DEFINITION);

    expect(engine.getEffectiveMaxStress('player', 'yamada')).toBe(6);
    engine.adjustStress('player', 'yamada', 6, 'test', true);

    const yamada = engine.getCharacter('player', 'yamada')!;
    expect(yamada).toBeTruthy();
    expect(yamada.statuses[GAMEPLAY_STATUS.hidden]?.stacks).toBe(1);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'yamada')).toBe(false);
    expect(game.player.leaderId).toBe('yamada');
    expect(game.player.works.some((work) => work.ownerId === 'yamada')).toBe(true);
  });
});
