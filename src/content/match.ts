export const BASE_DECK = [
  'soothe', 'guide', 'polish', 'reconsider', 'rush', 'voice',
  'overtime', 'writerBlock', 'soothe', 'guide', 'voice', 'overtime',
];

export const DEFAULT_MATCH = {
  maxRounds: 5,
  teamSize: 3,
  initialHandSize: 2,
  cardsPerRound: 2,
  handLimit: 8,
  player: { name: '我方創作小隊' },
  enemy: { name: '對手創作小隊' },
} as const;
