import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';

describe('神惱 UI immunity metadata', () => {
  it('marks 神惱 as immune to direct external member effects', () => {
    expect(CHARACTERS.shennau?.tags).toContain('external-effect-immune');
  });
});
