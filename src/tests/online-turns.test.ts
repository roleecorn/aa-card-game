import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { GameDefinition } from '../game/gameDefinition';
import { finishOnlineAssignment, performOnlineTeamActions } from '../game/onlineTurn';
import type { ActionChoice } from '../game/types';
import { swapGamePerspective } from '../online/protocol';

function onlineTestDefinition(): GameDefinition {
  return {
    ...STANDARD_GAME_DEFINITION,
    id: 'online-turn-test',
    rules: {
      ...STANDARD_GAME_DEFINITION.rules,
      maxRounds: 2,
      initialHandSize: 1,
      cardsPerRound: 1,
      handLimit: 1,
    },
  };
}

function allSlack(engine: EngineSession, side: 'player' | 'enemy'): Record<string, ActionChoice> {
  return Object.fromEntries(engine.getTeam(side).members.map((member) => [member.defId, 'slack'])) as Record<string, ActionChoice>;
}

describe('online human turn flow', () => {
  it('alternates Host and Guest manual plan/assignment phases before advancing the round', () => {
    const definition = onlineTestDefinition();
    const game = createInitialGame(() => 0.42, definition);
    const engine = new EngineSession(game, () => 0.42, definition);

    expect(game.phase).toBe('player-plan');
    expect(performOnlineTeamActions(engine, 'enemy', allSlack(engine, 'enemy'))).toBe(false);
    expect(performOnlineTeamActions(engine, 'player', allSlack(engine, 'player'))).toBe(true);
    expect(game.phase).toBe('player-assign');
    expect(finishOnlineAssignment(engine, 'enemy')).toBe(false);
    expect(finishOnlineAssignment(engine, 'player')).toBe(true);
    expect(game.phase).toBe('enemy-plan');

    expect(performOnlineTeamActions(engine, 'player', allSlack(engine, 'player'))).toBe(false);
    expect(performOnlineTeamActions(engine, 'enemy', allSlack(engine, 'enemy'))).toBe(true);
    expect(game.phase).toBe('enemy-assign');
    expect(finishOnlineAssignment(engine, 'enemy')).toBe(true);

    expect(game.round).toBe(2);
    expect(game.phase).toBe('player-plan');
  });

  it('keeps overflow cards for both human players instead of applying enemy AI auto-discard', () => {
    const definition = onlineTestDefinition();
    const game = createInitialGame(() => 0.31, definition);
    const engine = new EngineSession(game, () => 0.31, definition);

    expect(game.player.hand).toHaveLength(1);
    expect(game.enemy.hand).toHaveLength(1);

    performOnlineTeamActions(engine, 'player', allSlack(engine, 'player'));
    finishOnlineAssignment(engine, 'player');
    performOnlineTeamActions(engine, 'enemy', allSlack(engine, 'enemy'));
    finishOnlineAssignment(engine, 'enemy');

    expect(game.player.hand).toHaveLength(2);
    expect(game.enemy.hand).toHaveLength(2);
  });

  it('does not change the existing AI handoff used by standard play', () => {
    const definition = onlineTestDefinition();
    const game = createInitialGame(() => 0.27, definition);
    const engine = new EngineSession(game, () => 0.27, definition);

    engine.performPlayerActions(allSlack(engine, 'player'));
    expect(game.phase).toBe('player-assign');
    engine.finishPlayerAssignment();

    expect(game.round).toBe(2);
    expect(game.phase).toBe('player-plan');
    expect(game.phase).not.toBe('enemy-plan');
  });
});

describe('guest perspective', () => {
  it('swaps teams, phases and winner without mutating the Host snapshot', () => {
    const definition = onlineTestDefinition();
    const hostGame = createInitialGame(() => 0.53, definition);
    const hostPlayerIds = hostGame.player.members.map((member) => member.defId);
    const hostEnemyIds = hostGame.enemy.members.map((member) => member.defId);

    hostGame.phase = 'enemy-plan';
    hostGame.winner = 'player';
    const guestGame = swapGamePerspective(hostGame);

    expect(guestGame.phase).toBe('player-plan');
    expect(guestGame.player.members.map((member) => member.defId)).toEqual(hostEnemyIds);
    expect(guestGame.enemy.members.map((member) => member.defId)).toEqual(hostPlayerIds);
    expect(guestGame.winner).toBe('enemy');

    expect(hostGame.phase).toBe('enemy-plan');
    expect(hostGame.player.members.map((member) => member.defId)).toEqual(hostPlayerIds);
  });
});
