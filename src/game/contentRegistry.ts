import type { CardDefinition, CharacterDefinition, SkillDefinition } from './schema';

export interface GameContent {
  skills: Record<string, SkillDefinition>;
  characters: Record<string, CharacterDefinition>;
  cards: Record<string, CardDefinition>;
}
