import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';

describe('嵐羽 art references', () => {
  it('keeps portrait paths stable', () => {
    expect(CHARACTERS.lanyu?.portrait).toBe('/assets/characters/portrait/lanyu.webp');
    expect(CHARACTERS.lanyu?.compactPortrait).toBe('/assets/characters/compact/lanyu.webp');
  });
});
