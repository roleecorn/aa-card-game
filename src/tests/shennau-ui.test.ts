import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS } from '../content/catalog';

describe('神惱 UI immunity metadata', () => {
  it('keeps runtime immunity out of player-visible character tags', () => {
    expect(CHARACTERS.shennau?.tags ?? []).not.toContain('external-effect-immune');
    expect(SKILLS.shennauDoItMyself?.tags).toContain('external-effect-immune');
  });
});
