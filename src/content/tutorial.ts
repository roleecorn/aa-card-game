export const TUTORIAL_PLAYER_ROSTER = ['mashiro', 'grimm', 'triangle'] as const;
export const TUTORIAL_ENEMY_ROSTER = ['yashiro', 'pintbox', 'happy'] as const;

export const TUTORIAL_PLAYER_DECK = [
  'guide',
  'writerBlock',
  'polish',
  'soothe',
  'overtime',
  'voice',
  'reconsider',
  'rush',
  'guide',
  'polish',
  'soothe',
  'voice',
] as const;

export const TUTORIAL_ENEMY_DECK = [
  'soothe',
  'overtime',
  'writerBlock',
  'polish',
  'guide',
  'rush',
  'voice',
  'reconsider',
  'soothe',
  'overtime',
  'writerBlock',
  'polish',
] as const;

export const TUTORIAL_DIE_RESULTS = [
  4, 2, 5, 3, 6,
  2, 5, 4, 3, 6,
  5, 3, 4, 2, 6,
  4, 5, 3, 2, 6,
  3, 4, 5, 2, 6,
  5, 4, 3, 6, 2,
] as const;

export function tutorialRandomValue(index: number): number {
  const die = TUTORIAL_DIE_RESULTS[index % TUTORIAL_DIE_RESULTS.length] ?? 3;
  return (die - 0.5) / 6;
}

export type TutorialStepId =
  | 'grimm-slack'
  | 'grimm-work'
  | 'perform-work'
  | 'grimm-skill'
  | 'grimm-target'
  | 'dice-select'
  | 'work-slot'
  | 'card-guide'
  | 'card-target'
  | 'mashiro-skill'
  | 'mashiro-target'
  | 'triangle-skill'
  | 'triangle-target'
  | 'end-turn'
  | 'complete';