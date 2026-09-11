import type { MatchRules } from '../game/gameDefinition';

export const BASE_DECK = [
  'soothe', 'guide', 'polish', 'reconsider', 'rush', 'voice',
  'overtime', 'writerBlock', 'soothe', 'guide', 'voice', 'overtime',
] as const;

export const STANDARD_EXCLUDED_CHARACTER_IDS = ['chaos'] as const;

export function isStandardPlayableCharacterId(characterId: string): boolean {
  return !(STANDARD_EXCLUDED_CHARACTER_IDS as readonly string[]).includes(characterId);
}

export const DEFAULT_MATCH = {
  maxRounds: 5,
  teamSize: 3,
  initialHandSize: 2,
  cardsPerRound: 2,
  handLimit: 8,
  leaderStressBonus: 2,
  workLength: 5,
  missingWorkStatScore: -2,
  player: { name: '我方創作小隊' },
  enemy: { name: '對手創作小隊' },
} as const satisfies MatchRules;
