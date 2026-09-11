import type { GameContent } from '../game/contentRegistry';
import type { CardDefinition, CharacterDefinition, SkillDefinition, WorkType } from '../game/schema';
import { akikageCharacter, akikageSkills } from './akikage';
import { cardList } from './cards';
import { characterList } from './characters';
import {
  gameplayBoundaryMigrations,
  gameplayBoundarySkills,
  LEGACY_GAMEPLAY_TAGS,
} from './gameplayBoundarySkills';
import { lanyuCharacter, lanyuSkills } from './lanyu';
import { resolvePublicAssetPath } from './publicAssetPath';
import { shennauCharacter, shennauSkills } from './shennau';
import { skillList } from './skills';
import { viceLeaderPowerSkill } from './viceLeaderSkill';
import { weakzhiCharacter, weakzhiSkills } from './weakzhi';
import { yamadaCharacter, yamadaSkills } from './yamada';
export { BASE_DECK, DEFAULT_MATCH } from './match';
import { BASE_DECK } from './match';

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

const allSkills = [
  ...skillList,
  viceLeaderPowerSkill,
  ...gameplayBoundarySkills,
  ...weakzhiSkills,
  ...akikageSkills,
  ...yamadaSkills,
  ...lanyuSkills,
  ...shennauSkills,
];

const legacyGameplayTags = new Set<string>(LEGACY_GAMEPLAY_TAGS);
const sourceCharacters: CharacterDefinition[] = [
  ...characterList,
  weakzhiCharacter,
  akikageCharacter,
  yamadaCharacter,
  lanyuCharacter,
  shennauCharacter,
];

function assertLegacyGameplayMigration(character: CharacterDefinition): void {
  const actual = (character.tags ?? []).filter((tag) => legacyGameplayTags.has(tag)).sort();
  const expected = [...(gameplayBoundaryMigrations[character.id]?.legacyTags ?? [])].sort();
  if (actual.length !== expected.length || actual.some((tag, index) => tag !== expected[index])) {
    throw new Error(
      `Character ${character.id} has untracked gameplay tags (${actual.join(', ') || 'none'}); `
      + `expected legacy migration tags: ${expected.join(', ') || 'none'}.`,
    );
  }
}

sourceCharacters.forEach(assertLegacyGameplayMigration);

const allCharacters: CharacterDefinition[] = sourceCharacters.map((character) => ({
  ...character,
  skillIds: [
    ...character.skillIds,
    ...(gameplayBoundaryMigrations[character.id]?.skillIds ?? []),
  ],
  tags: character.tags?.filter((tag) => !legacyGameplayTags.has(tag)),
  portrait: resolvePublicAssetPath(character.portrait),
  compactPortrait: resolvePublicAssetPath(character.compactPortrait),
}));

export const SKILLS: Record<string, SkillDefinition> = toRecord(allSkills);
export const CHARACTERS: Record<string, CharacterDefinition> = toRecord(allCharacters);
export const CARDS: Record<string, CardDefinition> = toRecord(cardList);

export const WORK_TYPES: WorkType[] = ['燃', '謀', '笑', '情', '色', '怪'];

export const DEFAULT_CONTENT: GameContent = {
  skills: SKILLS,
  characters: CHARACTERS,
  cards: CARDS,
};

export function validateCatalog(): void {
  for (const character of allCharacters) {
    for (const tag of character.tags ?? []) {
      if (legacyGameplayTags.has(tag)) {
        throw new Error(`Character ${character.id} uses gameplay behavior tag ${tag}; implement behavior through skills instead.`);
      }
    }
    for (const skillId of character.skillIds) {
      if (!SKILLS[skillId]) throw new Error(`Character ${character.id} references missing skill ${skillId}`);
    }
  }
  for (const cardId of BASE_DECK) {
    if (!CARDS[cardId]) throw new Error(`BASE_DECK references missing card ${cardId}`);
  }
}

validateCatalog();
