import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT } from '../content/catalog';
import { createInitialGame } from '../game/engine';
import { actionChoicesForCurrentStress } from '../store/gameStore';

function fixedRng(value: number) {
  return () => value;
}

describe('max-stress action defaults', () => {
  it('forces capped characters to slack while preserving other requested actions', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const mashiro = game.player.members.find((member) => member.defId === 'mashiro')!;
    const maxStress = CHARACTERS.mashiro.maxStress;
    expect(maxStress).not.toBeNull();
    mashiro.stress = maxStress!;

    const choices = actionChoicesForCurrentStress(game, {
      pintbox: 'slack',
      mashiro: 'work',
      user79: 'work',
    });

    expect(choices).toEqual({
      pintbox: 'slack',
      mashiro: 'slack',
      user79: 'work',
    });
  });

  it('defaults a capped character to slack even without an explicit choice', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const target = game.player.members.find((member) => member.defId === 'user79')!;
    const maxStress = CHARACTERS.user79.maxStress;
    expect(maxStress).not.toBeNull();
    target.stress = maxStress!;

    expect(actionChoicesForCurrentStress(game).user79).toBe('slack');
  });
});
