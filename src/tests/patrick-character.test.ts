import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';

describe('派大星 complete character package', () => {
  it('uses the calibrated blank-card gameplay values', () => {
    expect(CHARACTERS.patrick?.stats).toEqual({ design: 0, text: 0, aa: 0 });
    expect(CHARACTERS.patrick?.maxStress).toBe(3);
    expect(CHARACTERS.patrick?.affinities).toEqual([]);
    expect(CHARACTERS.patrick?.skillIds).toEqual([]);
    expect(CHARACTERS.patrick?.tags).toEqual(expect.arrayContaining(['systems-thinker', 'review']));
    expect(CHARACTERS.patrick?.tags).not.toContain('graph-selected');
    expect(CHARACTERS.patrick?.portrait).toBe('/assets/characters/portrait/patrick.webp');
    expect(CHARACTERS.patrick?.compactPortrait).toBe('/assets/characters/compact/patrick.webp');
  });
});