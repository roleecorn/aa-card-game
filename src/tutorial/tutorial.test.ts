import { afterEach, describe, expect, it } from 'vitest';
import {
  TUTORIAL_DIE_RESULTS,
  TUTORIAL_ENEMY_DECK,
  TUTORIAL_ENEMY_ROSTER,
  TUTORIAL_PLAYER_DECK,
  TUTORIAL_PLAYER_ROSTER,
} from '../content/tutorial';
import { CHARACTERS } from '../content/catalog';
import { useGameStore } from '../store/gameStore';
import { createTutorialGame, createTutorialSession } from './runtime';
import {
  createTutorialRuntimeState,
  reduceTutorialEvent,
  type TutorialRuntimeState,
} from './scenario';

afterEach(() => {
  useGameStore.getState().reset();
});

describe('tutorial match', () => {
  it('uses fixed rosters and draw order', () => {
    useGameStore.getState().startTutorial();
    const state = useGameStore.getState();
    const game = state.game!;

    expect(state.mode).toBe('tutorial');
    expect(state.tutorial?.step).toBe('grimm-slack');
    expect(state.tutorial?.randomIndex).toBe(0);
    expect(game.player.members.map((member) => member.defId)).toEqual([...TUTORIAL_PLAYER_ROSTER]);
    expect(game.enemy.members.map((member) => member.defId)).toEqual([...TUTORIAL_ENEMY_ROSTER]);
    expect(game.player.hand.map((card) => card.cardId)).toEqual(TUTORIAL_PLAYER_DECK.slice(0, 2));
    expect(game.enemy.hand.map((card) => card.cardId)).toEqual(TUTORIAL_ENEMY_DECK.slice(0, 2));
    expect(game.player.deck).toEqual(TUTORIAL_PLAYER_DECK.slice(2));
    expect(game.enemy.deck).toEqual(TUTORIAL_ENEMY_DECK.slice(2));
  });

  it('replays the same fixed first player dice rolls from serialized runtime state', () => {
    useGameStore.getState().startTutorial();
    useGameStore.getState().performPlayerActions();
    const firstState = useGameStore.getState();
    const first = firstState.game!.player.pendingDice.map((die) => die.value);
    const expectedDiceCount = TUTORIAL_PLAYER_ROSTER.reduce((total, memberId) => {
      const stats = CHARACTERS[memberId]?.stats;
      return total + (stats ? stats.design + stats.text + stats.aa : 0);
    }, 0);

    expect(first).toEqual(TUTORIAL_DIE_RESULTS.slice(0, expectedDiceCount));
    expect(firstState.tutorial?.randomIndex).toBe(expectedDiceCount);
    expect(JSON.parse(JSON.stringify(firstState.tutorial))).toEqual(firstState.tutorial);

    useGameStore.getState().reset();
    useGameStore.getState().startTutorial();
    useGameStore.getState().performPlayerActions();
    const second = useGameStore.getState().game!.player.pendingDice.map((die) => die.value);

    expect(second).toEqual(first);
  });

  it('keeps deterministic RNG cursors isolated between tutorial sessions', () => {
    const runtimeA = createTutorialRuntimeState();
    const runtimeB = createTutorialRuntimeState();
    const sessionA = createTutorialSession(createTutorialGame(), runtimeA);
    const sessionB = createTutorialSession(createTutorialGame(), runtimeB);

    expect(sessionA.randomDie()).toBe(TUTORIAL_DIE_RESULTS[0]);
    expect(runtimeA.randomIndex).toBe(1);
    expect(runtimeB.randomIndex).toBe(0);

    expect(sessionA.randomDie()).toBe(TUTORIAL_DIE_RESULTS[1]);
    expect(sessionB.randomDie()).toBe(TUTORIAL_DIE_RESULTS[0]);
    expect(runtimeA.randomIndex).toBe(2);
    expect(runtimeB.randomIndex).toBe(1);
  });
});

describe('tutorial controller', () => {
  it('advances only for the semantic event expected by the current scenario step', () => {
    let runtime = createTutorialRuntimeState();

    runtime = reduceTutorialEvent(runtime, { type: 'actionChanged', memberId: 'mashiro', action: 'slack' });
    expect(runtime.step).toBe('grimm-slack');

    runtime = reduceTutorialEvent(runtime, { type: 'actionChanged', memberId: 'grimm', action: 'slack' });
    expect(runtime.step).toBe('grimm-work');

    runtime = reduceTutorialEvent(runtime, { type: 'actionChanged', memberId: 'grimm', action: 'work' });
    expect(runtime.step).toBe('perform-work');

    runtime = reduceTutorialEvent(runtime, { type: 'playerActionsPerformed' });
    expect(runtime.step).toBe('grimm-skill');

    runtime = reduceTutorialEvent(runtime, { type: 'skillDialogOpened', memberId: 'grimm', skillId: 'grimmBurningFrame' });
    expect(runtime.step).toBe('grimm-target');

    runtime = reduceTutorialEvent(runtime, { type: 'skillDialogClosed', memberId: 'grimm', skillId: 'grimmBurningFrame' });
    expect(runtime.step).toBe('grimm-skill');
  });

  it('uses result events for success and retry transitions', () => {
    let runtime: TutorialRuntimeState = { ...createTutorialRuntimeState(), step: 'card-target' };

    runtime = reduceTutorialEvent(runtime, { type: 'cardResolved', cardId: 'guide', success: false });
    expect(runtime.step).toBe('card-guide');

    runtime = { ...runtime, step: 'card-target' };
    runtime = reduceTutorialEvent(runtime, { type: 'cardResolved', cardId: 'guide', success: true });
    expect(runtime.step).toBe('mashiro-skill');

    runtime = { ...runtime, step: 'complete' };
    runtime = reduceTutorialEvent(runtime, { type: 'dismissed' });
    expect(runtime.step).toBeNull();
  });
});
