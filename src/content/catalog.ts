import type { GameContent } from '../game/contentRegistry';
import type { GameDefinition } from '../game/gameDefinition';
import type { CardDefinition, CharacterDefinition, SkillDefinition, WorkType } from '../game/schema';
import { akikageCharacter, akikageSkills } from './akikage';
import { cardList } from './cards';
import { chaosSkills } from './chaos';
import { characterList } from './characters';
import { lanyuCharacter, lanyuSkills } from './lanyu';
import { resolvePublicAssetPath } from './publicAssetPath';
import { shennauCharacter, shennauSkills } from './shennau';
import { skillList } from './skills';
import { viceLeaderPowerSkill } from './viceLeaderSkill';
import { weakzhiCharacter, weakzhiSkills } from './weakzhi';
import { yamadaCharacter, yamadaSkills } from './yamada';
export { BASE_DECK, DEFAULT_MATCH } from './match';
import { BASE_DECK, DEFAULT_MATCH, STANDARD_EXCLUDED_CHARACTER_IDS } from './match';

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

const FORBIDDEN_GAMEPLAY_TAGS = new Set([
  'no-stress',
  'cannot-act',
  'coordination-untargetable',
  'coordination-disabled-as-leader',
  'not-standard-playable',
]);

const allSkills = [
  ...skillList,
  viceLeaderPowerSkill,
  ...chaosSkills,
  ...weakzhiSkills,
  ...akikageSkills,
  ...yamadaSkills,
  ...lanyuSkills,
  ...shennauSkills,
];

const sourceCharacters: CharacterDefinition[] = [
  ...characterList,
  weakzhiCharacter,
  akikageCharacter,
  yamadaCharacter,
  lanyuCharacter,
  shennauCharacter,
];

const allCharacters: CharacterDefinition[] = sourceCharacters.map((character) => ({
  ...character,
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

export const STANDARD_GAME_DEFINITION: GameDefinition = {
  id: 'standard',
  content: DEFAULT_CONTENT,
  rules: DEFAULT_MATCH,
  deck: BASE_DECK,
  roster: {
    excludedCharacterIds: STANDARD_EXCLUDED_CHARACTER_IDS,
  },
};

export function validateCatalog(): void {
  for (const character of sourceCharacters) {
    for (const tag of character.tags ?? []) {
      if (FORBIDDEN_GAMEPLAY_TAGS.has(tag)) {
        throw new Error(`Character ${character.id} uses gameplay behavior tag ${tag}; implement behavior through skills instead.`);
      }
    }
    for (const skillId of character.skillIds) {
      if (!SKILLS[skillId]) throw new Error(`Character ${character.id} references missing skill ${skillId}`);
    }
  }
  for (const cardId of STANDARD_GAME_DEFINITION.deck) {
    if (!CARDS[cardId]) throw new Error(`Game definition ${STANDARD_GAME_DEFINITION.id} references missing card ${cardId}`);
  }
}

validateCatalog();
