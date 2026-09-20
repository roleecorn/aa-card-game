import type { MatchRules } from '../game/gameDefinition';

export const BASE_DECK = [
  'soothe', 'soothe',
  'oneOnOne', 'oneOnOne',
  'guide', 'guide',
  'voice', 'polish', 'inspiration', 'rush',
  'overtime', 'accident', 'writerBlock', 'techFailure', 'thoughtBlock',
] as const;

// Planned skills do not remove a character from the normal roster. Keeping
// planned characters selectable is important for integration/manual testing;
// only special-content characters are excluded from Standard/Online here.
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
