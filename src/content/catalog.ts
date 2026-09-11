import type { GameContent } from '../game/contentRegistry';
import type { GameDefinition } from '../game/gameDefinition';
import type { CardDefinition, CharacterDefinition, SkillDefinition, WorkType } from '../game/schema';
import { akikageCharacter, akikageSkills } from './akikage';
import { avocadoCharacter, avocadoSkills } from './avocado';
import { bluewindCharacter, bluewindSkills } from './bluewind';
import { cardList } from './cards';
import { chaosCharacter, chaosSkills } from './chaos';
import { emotionCharacter, emotionSkills } from './emotion';
import { fengyangCharacter, fengyangSkills } from './fengyang';
import { ghostshadowCharacter, ghostshadowSkills } from './ghostshadow';
import { ginsakuraCharacter, ginsakuraSkills } from './ginsakura';
import { grimmCharacter, grimmSkills } from './grimm';
import { happyCharacter, happySkills } from './happy';
import { kitsuCharacter, kitsuSkills } from './kitsu';
import { lanyuCharacter, lanyuSkills } from './lanyu';
import { lemonCharacter, lemonSkills } from './lemon';
import { mashiroCharacter, mashiroSkills } from './mashiro';
import { meteorCharacter, meteorSkills } from './meteor';
import { narratorCharacter, narratorSkills } from './narrator';
import { patrickCharacter, patrickSkills } from './patrick';
import { pigeonCharacter, pigeonSkills } from './pigeon';
import { pintboxCharacter, pintboxSkills } from './pintbox';
import { resolvePublicAssetPath } from './publicAssetPath';
import { shennauCharacter, shennauSkills } from './shennau';
import { tanxiCharacter, tanxiSkills } from './tanxi';
import { triangleCharacter, triangleSkills } from './triangle';
import { user79Character, user79Skills } from './user79';
import { viceLeaderPowerSkill } from './viceLeaderSkill';
import { weakzhiCharacter, weakzhiSkills } from './weakzhi';
import { yamadaCharacter, yamadaSkills } from './yamada';
import { yashiroCharacter, yashiroSkills } from './yashiro';
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

const allSkills: SkillDefinition[] = [
  ...pintboxSkills,
  ...mashiroSkills,
  ...user79Skills,
  ...narratorSkills,
  ...ginsakuraSkills,
  ...bluewindSkills,
  ...triangleSkills,
  ...fengyangSkills,
  ...happySkills,
  ...chaosSkills,
  ...meteorSkills,
  ...yashiroSkills,
  ...lemonSkills,
  ...emotionSkills,
  ...avocadoSkills,
  ...kitsuSkills,
  ...grimmSkills,
  ...pigeonSkills,
  ...tanxiSkills,
  ...ghostshadowSkills,
  ...patrickSkills,
  viceLeaderPowerSkill,
  ...weakzhiSkills,
  ...akikageSkills,
  ...yamadaSkills,
  ...lanyuSkills,
  ...shennauSkills,
];

const sourceCharacters: CharacterDefinition[] = [
  pintboxCharacter,
  mashiroCharacter,
  user79Character,
  narratorCharacter,
  ginsakuraCharacter,
  bluewindCharacter,
  triangleCharacter,
  fengyangCharacter,
  happyCharacter,
  chaosCharacter,
  meteorCharacter,
  yashiroCharacter,
  lemonCharacter,
  emotionCharacter,
  avocadoCharacter,
  kitsuCharacter,
  grimmCharacter,
  pigeonCharacter,
  tanxiCharacter,
  ghostshadowCharacter,
  patrickCharacter,
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
  const characterIds = new Set<string>();
  const skillIds = new Set<string>();

  for (const character of sourceCharacters) {
    if (characterIds.has(character.id)) throw new Error(`Duplicate character id ${character.id}`);
    characterIds.add(character.id);

    for (const tag of character.tags ?? []) {
      if (FORBIDDEN_GAMEPLAY_TAGS.has(tag)) {
        throw new Error(`Character ${character.id} uses gameplay behavior tag ${tag}; implement behavior through skills instead.`);
      }
    }
    for (const skillId of character.skillIds) {
      if (!SKILLS[skillId]) throw new Error(`Character ${character.id} references missing skill ${skillId}`);
    }
  }

  for (const skill of allSkills) {
    if (skillIds.has(skill.id)) throw new Error(`Duplicate skill id ${skill.id}`);
    skillIds.add(skill.id);
  }

  for (const cardId of STANDARD_GAME_DEFINITION.deck) {
    if (!CARDS[cardId]) throw new Error(`Game definition ${STANDARD_GAME_DEFINITION.id} references missing card ${cardId}`);
  }
}

validateCatalog();
