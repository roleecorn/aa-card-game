import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { isStandardPlayableCharacterId } from '../content/match';
import { hasCustomSkillEffect, registerCustomSkillEffect } from '../game/customEffects';
import { selectStandardRosters } from '../game/engine';
import type { SkillEffect } from '../game/schema';

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
    const missing = [...new Set(referencedCustomHandlers())]
      .filter((handler) => !hasCustomSkillEffect(handler))
      .sort();

    expect(missing).toEqual([]);
  });

  it('fails fast when a custom-handler name is registered twice', () => {
    const handlerName = '__skill-contract-duplicate-registration__';
    registerCustomSkillEffect(handlerName, () => true);

    expect(() => registerCustomSkillEffect(handlerName, () => false))
      .toThrow(`Duplicate custom skill effect registration: ${handlerName}`);
  });

  it('keeps planned-skill characters in the normal Standard selection pool for testing', () => {
    const excluded = [...STANDARD_GAME_DEFINITION.roster.excludedCharacterIds];
    const plannedPlayableCharacters = Object.values(CHARACTERS)
      .filter((character) => !excluded.includes(character.id))
      .filter((character) => character.skillIds.some((skillId) => SKILLS[skillId]?.status === 'planned'))
      .map((character) => character.id)
      .sort();
    const selected = selectStandardRosters(() => 0.5, STANDARD_GAME_DEFINITION);
    const selectionPool = [
      ...selected.playerMemberIds,
      ...selected.enemyMemberIds,
      ...selected.unusedMemberIds,
    ];

    expect(excluded).toEqual(['chaos']);
    expect(isStandardPlayableCharacterId('narrator')).toBe(true);
    expect(isStandardPlayableCharacterId('ginsakura')).toBe(true);
    expect(plannedPlayableCharacters).toEqual(['ginsakura', 'narrator']);
    expect(selectionPool).toEqual(expect.arrayContaining(['narrator', 'ginsakura']));
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
