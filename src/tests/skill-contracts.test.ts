import { describe, expect, it } from 'vitest';
import { SKILLS } from '../content/catalog';
import type { SkillEffect } from '../game/schema';

const gameSources = import.meta.glob('../game/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function customHandlers(effects: SkillEffect[] | undefined): string[] {
  return (effects ?? []).flatMap((effect) => effect.kind === 'custom' ? [effect.handler] : []);
}

function registeredCustomHandlers(): Set<string> {
  const names = new Set<string>();
  const registrationPattern = /registerCustomSkillEffect\(\s*['"]([^'"]+)['"]/g;
  for (const source of Object.values(gameSources)) {
    for (const match of source.matchAll(registrationPattern)) names.add(match[1]!);
  }
  return names;
}

describe('skill authoring contracts', () => {
  it('does not publish implemented skills without executable behavior', () => {
    const invalid = Object.values(SKILLS)
      .filter((skill) => skill.status !== 'planned')
      .filter((skill) => {
        if (skill.activation === 'active') return !skill.activeEffects?.length;
        if (skill.activation === 'triggered') return !skill.triggers?.length;
        return !skill.passives?.length;
      })
      .map((skill) => skill.id)
      .sort();

    expect(invalid).toEqual([]);
  });

  it('requires every referenced custom skill handler to be registered', () => {
    const registered = registeredCustomHandlers();
    const references = Object.values(SKILLS)
      .filter((skill) => skill.status !== 'planned')
      .flatMap((skill) => [
        ...customHandlers(skill.activeEffects),
        ...(skill.triggers ?? []).flatMap((trigger) => customHandlers(trigger.effects)),
      ]);
    const missing = [...new Set(references.filter((handler) => !registered.has(handler)))].sort();

    expect(missing).toEqual([]);
  });

  it('keeps shared usage groups explicit in schema rather than custom-handler counters', () => {
    const grouped = Object.values(SKILLS)
      .filter((skill) => skill.activeUsage?.group)
      .reduce<Record<string, string[]>>((result, skill) => {
        const group = skill.activeUsage!.group!;
        (result[group] ??= []).push(skill.id);
        return result;
      }, {});

    expect(grouped.adaoAdjustLength?.sort()).toEqual(['adaoLengthen', 'adaoShorten']);
  });
});
