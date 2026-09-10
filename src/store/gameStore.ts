import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { EngineSession, createInitialGame } from '../game/engine';
import type { ActionChoice, GameState, SkillActivationTarget, TeamState } from '../game/types';
import type { TeamId } from '../game/schema';
import {
  TUTORIAL_ENEMY_DECK,
  TUTORIAL_ENEMY_ROSTER,
  TUTORIAL_PLAYER_DECK,
  TUTORIAL_PLAYER_ROSTER,
  tutorialRandomValue,
} from '../content/tutorial';

type GameMode = 'standard' | 'tutorial';

interface GameStore {
  game: GameState | null;
  mode: GameMode;
  actionChoices: Record<string, ActionChoice>;
  reset: () => void;
  startGame: (playerMemberIds: string[], enemyMemberIds: string[]) => void;
  startTutorial: () => void;
  setActionChoice: (memberId: string, action: ActionChoice) => void;
  performPlayerActions: () => void;
  placeDie: (dieId: string, workId: string, slotIndex: number) => boolean;
  finishPlayerAssignment: () => void;
  playCard: (teamId: TeamId, instanceId: string, target: SkillActivationTarget) => boolean;
  discardCards: (teamId: TeamId, instanceIds: string[]) => boolean;
  activateSkill: (teamId: TeamId, memberId: string, skillId: string, target?: SkillActivationTarget) => boolean;
}

let tutorialRandomIndex = 0;

function defaultChoices(game: GameState): Record<string, ActionChoice> {
  return Object.fromEntries(game.player.members.map((member) => [member.defId, 'work'])) as Record<string, ActionChoice>;
}

function tutorialRandom(): number {
  const value = tutorialRandomValue(tutorialRandomIndex);
  tutorialRandomIndex += 1;
  return value;
}

function session(game: GameState, mode: GameMode): EngineSession {
  return new EngineSession(game, mode === 'tutorial' ? tutorialRandom : Math.random);
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

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    game: null,
    mode: 'standard',
    actionChoices: {},
    reset: () => set((state) => {
      tutorialRandomIndex = 0;
      state.game = null;
      state.mode = 'standard';
      state.actionChoices = {};
    }),
    startGame: (playerMemberIds, enemyMemberIds) => set((state) => {
      tutorialRandomIndex = 0;
      state.mode = 'standard';
      state.game = createInitialGame(Math.random, undefined, { playerMemberIds, enemyMemberIds });
      state.actionChoices = defaultChoices(state.game);
    }),
    startTutorial: () => set((state) => {
      const game = createInitialGame(() => 0.5, undefined, {
        playerMemberIds: [...TUTORIAL_PLAYER_ROSTER],
        enemyMemberIds: [...TUTORIAL_ENEMY_ROSTER],
      });
      applyTutorialDeck(game.player, TUTORIAL_PLAYER_DECK, 'player');
      applyTutorialDeck(game.enemy, TUTORIAL_ENEMY_DECK, 'enemy');
      game.logs.push({ id: 'tutorial-start', round: 1, text: '教學關卡：角色、抽牌順序與隨機結果已固定。' });
      tutorialRandomIndex = 0;
      state.mode = 'tutorial';
      state.game = game;
      state.actionChoices = defaultChoices(game);
    }),
    setActionChoice: (memberId, action) => set((state) => {
      state.actionChoices[memberId] = action;
    }),
    performPlayerActions: () => set((state) => {
      if (state.game) session(state.game as GameState, state.mode).performPlayerActions(state.actionChoices);
    }),
    placeDie: (dieId, workId, slotIndex) => {
      let result = false;
      set((state) => {
        if (state.game) result = session(state.game as GameState, state.mode).placeDie('player', dieId, workId, slotIndex);
      });
      return result;
    },
    finishPlayerAssignment: () => set((state) => {
      if (!state.game) return;
      session(state.game as GameState, state.mode).finishPlayerAssignment();
      state.actionChoices = defaultChoices(state.game as GameState);
    }),
    playCard: (teamId, instanceId, target) => {
      let result = false;
      set((state) => {
        if (state.game) result = session(state.game as GameState, state.mode).playCard(teamId, instanceId, target);
      });
      return result;
    },
    discardCards: (teamId, instanceIds) => {
      let result = false;
      set((state) => {
        if (state.game) result = session(state.game as GameState, state.mode).discardCards(teamId, instanceIds);
      });
      return result;
    },
    activateSkill: (teamId, memberId, skillId, target = {}) => {
      let result = false;
      set((state) => {
        if (state.game) result = session(state.game as GameState, state.mode).activateSkill(teamId, memberId, skillId, target);
      });
      return result;
    },
  })),
);