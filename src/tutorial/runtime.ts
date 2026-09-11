import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { GameState, TeamState } from '../game/types';
import {
  TUTORIAL_ENEMY_DECK,
  TUTORIAL_ENEMY_ROSTER,
  TUTORIAL_PLAYER_DECK,
  TUTORIAL_PLAYER_ROSTER,
  tutorialRandomValue,
} from './config';
import type { TutorialRuntimeState } from './scenario';

function tutorialRandom(runtime: TutorialRuntimeState): number {
  const value = tutorialRandomValue(runtime.randomIndex);
  runtime.randomIndex += 1;
  return value;
}

function startupHandAdditions(team: TeamState): TeamState['hand'] {
  const initialHandSize = STANDARD_GAME_DEFINITION.rules.initialHandSize;
  return team.hand.slice(initialHandSize).map((card) => ({ ...card }));
}

function applyTutorialDeck(
  team: TeamState,
  cardIds: readonly string[],
  prefix: string,
  startupCards: TeamState['hand'],
): void {
  const initialHandSize = STANDARD_GAME_DEFINITION.rules.initialHandSize;
  const fixedHand = cardIds.slice(0, initialHandSize).map((cardId, index) => ({
    instanceId: `tutorial-${prefix}-card-${index + 1}`,
    cardId,
  }));
  team.hand = [...fixedHand, ...startupCards];
  team.deck = [...cardIds.slice(initialHandSize)];
  team.discard = [];
}

export function createTutorialGame(): GameState {
  const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
    playerMemberIds: [...TUTORIAL_PLAYER_ROSTER],
    enemyMemberIds: [...TUTORIAL_ENEMY_ROSTER],
  });

  // createInitialGame has already emitted gameStart. Preserve cards granted by
  // startup Skills while replacing only the randomly drawn fixture hand/deck.
  const playerStartupCards = startupHandAdditions(game.player);
  const enemyStartupCards = startupHandAdditions(game.enemy);
  applyTutorialDeck(game.player, TUTORIAL_PLAYER_DECK, 'player', playerStartupCards);
  applyTutorialDeck(game.enemy, TUTORIAL_ENEMY_DECK, 'enemy', enemyStartupCards);
  game.logs.push({ id: 'tutorial-start', round: 1, text: '教學關卡：角色、抽牌順序與隨機結果已固定。' });
  return game;
}

export function createTutorialSession(game: GameState, runtime: TutorialRuntimeState): EngineSession {
  return new EngineSession(game, () => tutorialRandom(runtime), STANDARD_GAME_DEFINITION);
}
