import type { GameContent } from './contentRegistry';

export interface MatchRules {
  maxRounds: number;
  teamSize: number;
  initialHandSize: number;
  cardsPerRound: number;
  handLimit: number;
  leaderStressBonus: number;
  workLength: number;
  missingWorkStatScore: number;
  player: { name: string };
  enemy: { name: string };
}

export interface GameDefinition {
  id: string;
  content: GameContent;
  rules: MatchRules;
  deck: readonly string[];
  roster: {
    excludedCharacterIds: readonly string[];
  };
}

export function withGameContent(definition: GameDefinition, content: GameContent): GameDefinition {
  return { ...definition, content };
}
