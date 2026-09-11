import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS } from '../content/catalog';

const contentModules = import.meta.glob('../content/*.ts', { eager: true });
const contentSources = import.meta.glob('../content/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const componentSources = import.meta.glob('../components/*.tsx', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

describe('character content package layout', () => {
  it('keeps every catalog character in its own src/content module', () => {
    const modulePaths = Object.keys(contentModules);

    expect(modulePaths).not.toContain('../content/characters.ts');
    expect(modulePaths).not.toContain('../content/skills.ts');

    for (const characterId of Object.keys(CHARACTERS)) {
      expect(modulePaths, `missing content package for ${characterId}`).toContain(`../content/${characterId}.ts`);
    }
  });

  it('does not publish implemented orphan skills that no character can activate or trigger', () => {
    const referencedSkillIds = new Set(
      Object.values(CHARACTERS).flatMap((character) => character.skillIds),
    );
    const orphanSkillIds = Object.values(SKILLS)
      .filter((skill) => skill.status !== 'planned' && !referencedSkillIds.has(skill.id))
      .map((skill) => skill.id)
      .sort();

    expect(orphanSkillIds).toEqual([]);
  });

  it('does not keep obsolete Tutorial compatibility bridge modules', () => {
    expect(Object.keys(contentSources)).not.toContain('../content/tutorial.ts');
    expect(Object.keys(componentSources)).not.toContain('../components/TutorialGuide.tsx');
  });

  it('keeps character asset references repository-relative in authoring source', () => {
    const offenders = Object.entries(contentSources)
      .flatMap(([modulePath, source]) => {
        const matches = [...source.matchAll(/(?:portrait|compactPortrait):\s*['"](\/assets\/characters\/[^'"]+)['"]/g)];
        return matches.map((match) => `${modulePath}: ${match[1]}`);
      })
      .sort();

    expect(offenders).toEqual([]);
  });
});
