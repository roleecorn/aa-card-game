import { createInitialGame, EngineSession } from '../game/engine';
import type { GameState, TeamState } from '../game/types';
import {
  TUTORIAL_ENEMY_DECK,
  TUTORIAL_ENEMY_ROSTER,
  TUTORIAL_PLAYER_DECK,
  TUTORIAL_PLAYER_ROSTER,
  tutorialRandomValue,
} from './config';

let tutorialRandomIndex = 0;

function tutorialRandom(): number {
  const value = tutorialRandomValue(tutorialRandomIndex);
  tutorialRandomIndex += 1;
  return value;
}

function applyTutorialDeck(team: TeamState, cardIds: readonly string[], prefix: string): void {
  const initialHandSize = 2;
  team.hand = cardIds.slice(0, initialHandSize).map((cardId, index) => ({
    instanceId: `tutorial-${prefix}-card-${index + 1}`,
    cardId,
  }));
  team.deck = [...cardIds.slice(initialHandSize)];
  team.discard = [];
}

export function resetTutorialRuntime(): void {
  tutorialRandomIndex = 0;
}

export function createTutorialGame(): GameState {
  const game = createInitialGame(() => 0.5, undefined, {
    playerMemberIds: [...TUTORIAL_PLAYER_ROSTER],
    enemyMemberIds: [...TUTORIAL_ENEMY_ROSTER],
  });
  applyTutorialDeck(game.player, TUTORIAL_PLAYER_DECK, 'player');
  applyTutorialDeck(game.enemy, TUTORIAL_ENEMY_DECK, 'enemy');
  game.logs.push({ id: 'tutorial-start', round: 1, text: '教學關卡：角色、抽牌順序與隨機結果已固定。' });
  resetTutorialRuntime();
  return game;
}

export function createTutorialSession(game: GameState): EngineSession {
  return new EngineSession(game, tutorialRandom);
}
