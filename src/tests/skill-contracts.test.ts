import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { executeCustomSkillEffect } from '../game/customEffects';
import type { EngineSession } from '../game/engine';
import type { SkillEffect } from '../game/schema';
import type { EffectContext } from '../game/types';

const gameSources = import.meta.glob('../game/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function customHandlers(effects: SkillEffect[] | undefined): string[] {
  return (effects ?? []).flatMap((effect) => effect.kind === 'custom' ? [effect.handler] : []);
}

function referencedCustomHandlers(): string[] {
  return Object.values(SKILLS)
    .filter((skill) => skill.status !== 'planned')
    .flatMap((skill) => [
      ...customHandlers(skill.activeEffects),
      ...(skill.triggers ?? []).flatMap((trigger) => customHandlers(trigger.effects)),
    ]);
}

function sourceRegistrations(): string[] {
  const names: string[] = [];
  const registrationPattern = /registerCustomSkillEffect\(\s*['"]([^'"]+)['"]/g;
  for (const source of Object.values(gameSources)) {
    for (const match of source.matchAll(registrationPattern)) names.push(match[1]!);
  }
  return names;
}

function assertRuntimeHandlerRegistered(handler: string): void {
  const missingLogs: string[] = [];
  const engine = new Proxy({
    log: (message: string) => missingLogs.push(message),
  } as unknown as EngineSession, {
    get(target, property, receiver) {
      if (Reflect.has(target as object, property)) return Reflect.get(target as object, property, receiver);
      throw new Error(`registered handler touched test-only engine property ${String(property)}`);
    },
  });
  const context: EffectContext = {
    ownerId: 'contract-owner',
    ownerTeamId: 'player',
    definition: { id: 'contract-skill', name: 'contract-skill' },
    event: { type: 'activeSkill', teamId: 'player', actorId: 'contract-owner' },
  };

  try {
    executeCustomSkillEffect({ kind: 'custom', handler }, context, engine);
  } catch {
    // A registered handler may require real game state; registry reachability is
    // the contract here. Missing handlers are detected by the explicit log.
  }
  expect(missingLogs.filter((message) => message.includes('找不到 custom handler')), handler).toEqual([]);
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

  it('requires every referenced custom skill handler to exist in the live runtime registry', () => {
    for (const handler of [...new Set(referencedCustomHandlers())].sort()) {
      assertRuntimeHandlerRegistered(handler);
    }
  });

  it('forbids duplicate custom-handler registrations that would silently overwrite behavior', () => {
    const registrations = sourceRegistrations();
    const duplicates = [...new Set(registrations.filter((name, index) => registrations.indexOf(name) !== index))].sort();
    expect(duplicates).toEqual([]);
  });

  it('keeps Standard roster limited to characters whose declared skills are executable', () => {
    const excluded = new Set(STANDARD_GAME_DEFINITION.roster.excludedCharacterIds);
    const incompletePlayableCharacters = Object.values(CHARACTERS)
      .filter((character) => !excluded.has(character.id))
      .filter((character) => character.skillIds.some((skillId) => SKILLS[skillId]?.status === 'planned'))
      .map((character) => character.id)
      .sort();

    expect(incompletePlayableCharacters).toEqual([]);
    expect(excluded).toEqual(expect.objectContaining(new Set(['chaos', 'narrator', 'ginsakura'])));
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
