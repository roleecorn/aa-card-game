import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS } from '../content/catalog';

describe('神惱 immunity skill metadata', () => {
  it('keeps runtime immunity in the Skill system instead of player-visible character tags', () => {
    expect(CHARACTERS.shennau?.tags ?? []).not.toContain('external-effect-immune');
    expect(CHARACTERS.shennau?.skillIds).toContain('shennauDoItMyself');
    expect(SKILLS.shennauDoItMyself?.status).toBe('implemented');
    expect(SKILLS.shennauDoItMyself?.passives).toContainEqual({ kind: 'effect.immunity', source: 'external' });
    expect(SKILLS.shennauDoItMyself?.triggers).toEqual(expect.arrayContaining([
      expect.objectContaining({ event: 'beforeExternalStress' }),
      expect.objectContaining({ event: 'beforeDieModified' }),
    ]));
  });
});
