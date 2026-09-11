import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { DieToken } from '../game/types';

const ROSTER = {
  playerMemberIds: ['pintbox', 'akikage', 'weakzhi'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('秋影 complete character package', () => {
  it('uses PintBox-confirmed stats and starts at Stress 3', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    expect(CHARACTERS.akikage?.stats).toEqual({ design: 1, text: 2, aa: 1 });
    expect(CHARACTERS.akikage?.maxStress).toBe(3);
    expect(CHARACTERS.akikage?.affinities).toEqual([]);
    expect(CHARACTERS.akikage?.portrait).toBe('/assets/characters/portrait/akikage.webp');
    expect(SKILLS.akikageDeadlineWarrior?.status).toBe('implemented');
    expect(game.player.members.find((member) => member.defId === 'akikage')?.stress).toBe(3);
  });

  it('follows the common max-stress rule and is forced to slack at game start', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    expect(game.player.leaderId).toBe('pintbox');
    expect(engine.getEffectiveMaxStress('player', 'akikage')).toBe(3);

    engine.performPlayerActions({ akikage: 'work', weakzhi: 'work', pintbox: 'slack' });

    expect(game.player.members.find((member) => member.defId === 'akikage')?.stress).toBe(1);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'akikage')).toBe(false);
  });

  it('removes own rolled 1 and 2 dice from the current batch', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const dice: DieToken[] = [
      { id: 'd1', ownerId: 'akikage', skill: 'design', value: 1, round: 1, origin: 'test' },
      { id: 'd2', ownerId: 'akikage', skill: 'text', value: 2, round: 1, origin: 'test' },
      { id: 'd3', ownerId: 'akikage', skill: 'aa', value: 3, round: 1, origin: 'test' },
    ];
    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'akikage', dice, amount: dice.length, sourceKind: 'work' });
    expect(dice.map((die) => die.value)).toEqual([3]);
  });

  it('does not remove another character\'s low dice', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const dice: DieToken[] = [
      { id: 'd1', ownerId: 'pintbox', skill: 'design', value: 1, round: 1, origin: 'test' },
    ];
    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'pintbox', dice, amount: 1, sourceKind: 'work' });
    expect(dice).toHaveLength(1);
  });
});
