import type { GameContent } from '../game/contentRegistry';
import type { CardDefinition, CharacterDefinition, SkillDefinition, WorkType } from '../game/schema';
import { akikageCharacter, akikageSkills } from './akikage';
import { cardList } from './cards';
import { characterList } from './characters';
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

const allSkills = [...skillList, viceLeaderPowerSkill, ...weakzhiSkills, ...akikageSkills, ...yamadaSkills, ...lanyuSkills, ...shennauSkills];
const allCharacters: CharacterDefinition[] = [
  ...characterList,
  weakzhiCharacter,
  akikageCharacter,
  yamadaCharacter,
  lanyuCharacter,
  shennauCharacter,
].map((character) => ({
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

export function validateCatalog(): void {
  for (const character of allCharacters) {
    for (const skillId of character.skillIds) {
      if (!SKILLS[skillId]) throw new Error(`Character ${character.id} references missing skill ${skillId}`);
    }
  }
  for (const cardId of BASE_DECK) {
    if (!CARDS[cardId]) throw new Error(`BASE_DECK references missing card ${cardId}`);
  }
}

validateCatalog();
