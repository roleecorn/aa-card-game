import { afterEach, describe, expect, it } from 'vitest';
import {
  TUTORIAL_DIE_RESULTS,
  TUTORIAL_ENEMY_DECK,
  TUTORIAL_ENEMY_ROSTER,
  TUTORIAL_PLAYER_DECK,
  TUTORIAL_PLAYER_ROSTER,
} from '../content/tutorial';
import { useGameStore } from '../store/gameStore';

afterEach(() => {
  useGameStore.getState().reset();
});

describe('tutorial match', () => {
  it('uses fixed rosters and draw order', () => {
    useGameStore.getState().startTutorial();
    const state = useGameStore.getState();
    const game = state.game!;

    expect(state.mode).toBe('tutorial');
    expect(game.player.members.map((member) => member.defId)).toEqual([...TUTORIAL_PLAYER_ROSTER]);
    expect(game.enemy.members.map((member) => member.defId)).toEqual([...TUTORIAL_ENEMY_ROSTER]);
    expect(game.player.hand.map((card) => card.cardId)).toEqual(TUTORIAL_PLAYER_DECK.slice(0, 2));
    expect(game.enemy.hand.map((card) => card.cardId)).toEqual(TUTORIAL_ENEMY_DECK.slice(0, 2));
    expect(game.player.deck).toEqual(TUTORIAL_PLAYER_DECK.slice(2));
    expect(game.enemy.deck).toEqual(TUTORIAL_ENEMY_DECK.slice(2));
  });

  it('replays the same fixed first player dice rolls', () => {
    useGameStore.getState().startTutorial();
    useGameStore.getState().performPlayerActions();
    const first = useGameStore.getState().game!.player.pendingDice.map((die) => die.value);

    expect(first).toEqual(TUTORIAL_DIE_RESULTS.slice(0, 15));

    useGameStore.getState().reset();
    useGameStore.getState().startTutorial();
    useGameStore.getState().performPlayerActions();
    const second = useGameStore.getState().game!.player.pendingDice.map((die) => die.value);

    expect(second).toEqual(first);
  });
});