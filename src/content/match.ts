import type { WorkType } from '../game/schema';

export const BASE_DECK = [
  'soothe', 'guide', 'polish', 'reconsider', 'rush', 'voice',
  'overtime', 'writerBlock', 'soothe', 'guide', 'voice', 'overtime',
];

export const DEFAULT_MATCH = {
  maxRounds: 5,
  player: { name: '我方創作小隊', memberIds: ['pintbox', 'mashiro', 'user79'], workTypes: ['謀', '情', '燃'] as WorkType[] },
  enemy: { name: '對手創作小隊', memberIds: ['narrator', 'ginsakura', 'bluewind'], workTypes: ['笑', '情', '謀'] as WorkType[] },
} as const;
