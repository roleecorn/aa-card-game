import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';
import battleRoomSource from '../app/BattleRoom.tsx?raw';
import storeSource from '../store/gameStore.ts?raw';

describe('shared battle room boundary', () => {
  it('keeps stage setup in App and the active match UI in BattleRoom', () => {
    expect(appSource).toContain("import { BattleRoom } from './BattleRoom'");
    expect(appSource).toContain('<BattleRoom onRestart={handleRestart} />');
    expect(appSource).not.toContain('<TeamColumn');
    expect(appSource).not.toContain('<WorkBoard');
    expect(battleRoomSource).toContain('<TeamColumn');
    expect(battleRoomSource).toContain('<WorkBoard');
    expect(battleRoomSource).toContain('<CardHand');
  });

  it('does not alter the existing AI turn handoff in the extraction', () => {
    expect(storeSource).toContain('finishPlayerAssignment');
    expect(storeSource).toContain('.finishPlayerAssignment()');
  });
});
