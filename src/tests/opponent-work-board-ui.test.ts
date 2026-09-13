import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';

describe('opponent work board UI', () => {
  it('shows the opponent work board directly below the player work board', () => {
    const playerBoardIndex = appSource.indexOf('works={game.player.works}');
    const enemyHeadingIndex = appSource.indexOf('對手小隊作品');
    const enemyBoardIndex = appSource.indexOf('works={game.enemy.works}');
    const diceIndex = appSource.indexOf('本回合骰子');

    expect(playerBoardIndex).toBeGreaterThan(-1);
    expect(enemyHeadingIndex).toBeGreaterThan(playerBoardIndex);
    expect(enemyBoardIndex).toBeGreaterThan(enemyHeadingIndex);
    expect(diceIndex).toBeGreaterThan(enemyBoardIndex);
  });

  it('keeps opponent works available for legal work targeting without enabling die placement', () => {
    const enemyBoardIndex = appSource.indexOf('works={game.enemy.works}');
    const diceIndex = appSource.indexOf('本回合骰子');
    const enemyBoardSource = appSource.slice(enemyBoardIndex, diceIndex);

    expect(enemyBoardSource).toContain('workSelection={workCandidates ?');
    expect(enemyBoardSource).not.toContain('selectedDie={selectedDie}');
    expect(enemyBoardSource).not.toContain('slotSelection=');
    expect(enemyBoardSource).not.toContain('onSlotClick=');
  });
});
