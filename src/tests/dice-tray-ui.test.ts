import { describe, expect, it } from 'vitest';
import diceTraySource from '../components/DiceTray.tsx?raw';

describe('dice tray UI', () => {
  it('groups dice by owner and labels each owner group once', () => {
    expect(diceTraySource).toContain('new Map<string, DieTokenModel[]>()');
    expect(diceTraySource).toContain('groups.set(die.ownerId, [die])');
    expect(diceTraySource).toContain('data-dice-owner={ownerId}');
    expect(diceTraySource).toContain('{CHARACTERS[ownerId]?.name ?? ownerId}');
    expect(diceTraySource).toContain('ownerDice.map((die, index) =>');
  });

  it('keeps the owner label outside individual die tokens', () => {
    const ownerLabelIndex = diceTraySource.indexOf('{CHARACTERS[ownerId]?.name ?? ownerId}');
    const ownerDiceIndex = diceTraySource.indexOf('ownerDice.map((die, index) =>');

    expect(ownerLabelIndex).toBeGreaterThan(-1);
    expect(ownerDiceIndex).toBeGreaterThan(ownerLabelIndex);
  });
});
