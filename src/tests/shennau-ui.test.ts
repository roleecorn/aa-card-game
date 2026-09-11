import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';
import { hasCharacterMechanic } from '../content/characterMechanics';

describe('神惱 UI immunity metadata', () => {
  it('keeps runtime immunity out of player-visible character tags', () => {
    expect(CHARACTERS.shennau?.tags ?? []).not.toContain('external-effect-immune');
    expect(hasCharacterMechanic('shennau', 'externalEffectImmune')).toBe(true);
  });
});
