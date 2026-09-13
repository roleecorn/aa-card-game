import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';

describe('opponent work board UI', () => {
  it('shows dice between the player works and opponent works', () => {
    const playerBoardIndex = appSource.indexOf('works={game.player.works}');
    const diceIndex = appSource.indexOf('本回合骰子');
    const enemyHeadingIndex = appSource.indexOf('對手小隊作品');
    const enemyBoardIndex = appSource.indexOf('works={game.enemy.works}');

    expect(playerBoardIndex).toBeGreaterThan(-1);
    expect(diceIndex).toBeGreaterThan(playerBoardIndex);
    expect(enemyHeadingIndex).toBeGreaterThan(diceIndex);
    expect(enemyBoardIndex).toBeGreaterThan(enemyHeadingIndex);
  });

  it('keeps opponent works available for legal work targeting without enabling die placement', () => {
    const enemyBoardIndex = appSource.indexOf('works={game.enemy.works}');
    const handIndex = appSource.indexOf('我的手牌');
    const enemyBoardSource = appSource.slice(enemyBoardIndex, handIndex);

    expect(enemyBoardSource).toContain('workSelection={workCandidates ?');
    expect(enemyBoardSource).not.toContain('selectedDie={selectedDie}');
    expect(enemyBoardSource).not.toContain('slotSelection=');
    expect(enemyBoardSource).not.toContain('onSlotClick=');
  });
});
