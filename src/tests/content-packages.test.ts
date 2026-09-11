import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';

const contentModules = import.meta.glob('../content/*.ts', { eager: true });

describe('character content package layout', () => {
  it('keeps every catalog character in its own src/content module', () => {
    const modulePaths = Object.keys(contentModules);

    expect(modulePaths).not.toContain('../content/characters.ts');
    expect(modulePaths).not.toContain('../content/skills.ts');

    for (const characterId of Object.keys(CHARACTERS)) {
      expect(modulePaths, `missing content package for ${characterId}`).toContain(`../content/${characterId}.ts`);
    }
  });
});
