import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';
import { setSelectedLeaderId } from '../game/leaderSelection';
import { useGameStore } from '../store/gameStore';

const PLAYER = ['pintbox', 'mashiro', 'user79'];
const ENEMY = ['narrator', 'ginsakura', 'bluewind'];

describe('pre-game leader selection', () => {
  afterEach(() => {
    useGameStore.getState().reset();
  });

  it('uses the selected player member as leader and raises both team leaders stress cap by 2', () => {
    const pintboxBase = CHARACTERS.pintbox!.maxStress;
    const mashiroBase = CHARACTERS.mashiro!.maxStress;
    const narratorBase = CHARACTERS.narrator!.maxStress;

    setSelectedLeaderId('mashiro');
    useGameStore.getState().startGame(PLAYER, ENEMY);

    const game = useGameStore.getState().game!;
    expect(game.player.leaderId).toBe('mashiro');
    expect(game.player.members[0]?.defId).toBe('mashiro');
    expect(game.enemy.leaderId).toBe('narrator');
    expect(CHARACTERS.mashiro?.maxStress).toBe((mashiroBase ?? 0) + 2);
    expect(CHARACTERS.narrator?.maxStress).toBe((narratorBase ?? 0) + 2);
    expect(CHARACTERS.pintbox?.maxStress).toBe(pintboxBase);
  });

  it('restores leader stress caps when the match is reset', () => {
    const mashiroBase = CHARACTERS.mashiro!.maxStress;
    const narratorBase = CHARACTERS.narrator!.maxStress;

    setSelectedLeaderId('mashiro');
    useGameStore.getState().startGame(PLAYER, ENEMY);
    useGameStore.getState().reset();

    expect(CHARACTERS.mashiro?.maxStress).toBe(mashiroBase);
    expect(CHARACTERS.narrator?.maxStress).toBe(narratorBase);
  });
});
