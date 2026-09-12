import { castDraft } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { EngineSession, createInitialGame } from '../game/engine';
import { placeDieWithLegality } from '../game/placement';
import type { GameDefinition } from '../game/gameDefinition';
import type { ActionChoice, GameState, SkillActivationTarget } from '../game/types';
import type { TeamId } from '../game/schema';
import { createTutorialGame, createTutorialSession } from '../tutorial/runtime';
import {
  createTutorialRuntimeState,
  reduceTutorialEvent,
  type TutorialEvent,
  type TutorialRuntimeState,
} from '../tutorial/scenario';

type GameMode = 'standard' | 'tutorial';

interface GameStore {
  game: GameState | null;
  gameDefinition: GameDefinition;
  mode: GameMode;
  tutorial: TutorialRuntimeState | null;
  actionChoices: Record<string, ActionChoice>;
  reset: () => void;
  startGame: (
    playerMemberIds: string[],
    enemyMemberIds: string[],
    playerLeaderId?: string,
    gameDefinition?: GameDefinition,
  ) => void;
  startTutorial: () => void;
  tutorialEvent: (event: TutorialEvent) => void;
  dismissTutorial: () => void;
  setActionChoice: (memberId: string, action: ActionChoice) => void;
  performPlayerActions: () => void;
  placeDie: (dieId: string, workId: string, slotIndex: number) => boolean;
  finishPlayerAssignment: () => void;
  playCard: (teamId: TeamId, instanceId: string, target?: SkillActivationTarget) => boolean;
  discardCards: (teamId: TeamId, instanceIds: string[]) => boolean;
  activateSkill: (teamId: TeamId, memberId: string, skillId: string, target?: SkillActivationTarget) => boolean;
}

function moveLeaderFirst(memberIds: string[], leaderId: string | undefined): string[] {
  if (!leaderId || !memberIds.includes(leaderId)) return [...memberIds];
  return [leaderId, ...memberIds.filter((memberId) => memberId !== leaderId)];
}

export function actionChoicesForCurrentStress(
  game: GameState,
  requestedChoices: Record<string, ActionChoice> = {},
  gameDefinition: GameDefinition = STANDARD_GAME_DEFINITION,
): Record<string, ActionChoice> {
  const engine = new EngineSession(game, Math.random, gameDefinition);
  return Object.fromEntries(game.player.members.map((member) => [
    member.defId,
    engine.isAtStressCap('player', member.defId) ? 'slack' : requestedChoices[member.defId] ?? 'work',
  ])) as Record<string, ActionChoice>;
}

function defaultChoices(game: GameState, gameDefinition: GameDefinition): Record<string, ActionChoice> {
  return actionChoicesForCurrentStress(game, {}, gameDefinition);
}

function session(
  game: GameState,
  mode: GameMode,
  tutorial: TutorialRuntimeState | null,
  gameDefinition: GameDefinition,
): EngineSession {
  if (mode === 'tutorial') {
    if (!tutorial) throw new Error('Tutorial mode requires tutorial runtime state.');
    return createTutorialSession(game, tutorial);
  }
  return new EngineSession(game, Math.random, gameDefinition);
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    game: null,
    gameDefinition: STANDARD_GAME_DEFINITION,
    mode: 'standard',
    tutorial: null,
    actionChoices: {},
    reset: () => set((state) => {
      state.game = null;
      state.gameDefinition = castDraft(STANDARD_GAME_DEFINITION);
      state.mode = 'standard';
      state.tutorial = null;
      state.actionChoices = {};
    }),
    startGame: (playerMemberIds, enemyMemberIds, requestedLeaderId, requestedGameDefinition) => set((state) => {
      const gameDefinition = requestedGameDefinition ?? state.gameDefinition ?? STANDARD_GAME_DEFINITION;
      const selectedLeaderId = requestedLeaderId && playerMemberIds.includes(requestedLeaderId)
        ? requestedLeaderId
        : playerMemberIds[0];
      const orderedPlayerMemberIds = moveLeaderFirst(playerMemberIds, selectedLeaderId);

      state.gameDefinition = castDraft(gameDefinition);
      state.mode = 'standard';
      state.tutorial = null;
      state.game = createInitialGame(Math.random, gameDefinition, {
        playerMemberIds: orderedPlayerMemberIds,
        enemyMemberIds,
      });
      state.actionChoices = defaultChoices(state.game as GameState, gameDefinition);
    }),
    startTutorial: () => set((state) => {
      const game = createTutorialGame();
      // Scenario setup replaces the opening hand; do not replay discarded setup effects.
      game.feedback = [];
      state.gameDefinition = castDraft(STANDARD_GAME_DEFINITION);
      state.mode = 'tutorial';
      state.tutorial = createTutorialRuntimeState();
      state.game = game;
      state.actionChoices = defaultChoices(game, STANDARD_GAME_DEFINITION);
    }),
    tutorialEvent: (event) => set((state) => {
      if (state.mode !== 'tutorial' || !state.tutorial) return;
      state.tutorial = reduceTutorialEvent(state.tutorial as TutorialRuntimeState, event);
    }),
    dismissTutorial: () => set((state) => {
      if (state.mode !== 'tutorial' || !state.tutorial) return;
      state.tutorial = reduceTutorialEvent(state.tutorial as TutorialRuntimeState, { type: 'dismissed' });
    }),
    setActionChoice: (memberId, action) => set((state) => {
      state.actionChoices[memberId] = action;
    }),
    performPlayerActions: () => set((state) => {
      if (!state.game) return;
      const gameDefinition = state.gameDefinition as GameDefinition;
      state.actionChoices = actionChoicesForCurrentStress(state.game as GameState, state.actionChoices, gameDefinition);
      session(
        state.game as GameState,
        state.mode,
        state.tutorial as TutorialRuntimeState | null,
        gameDefinition,
      ).performPlayerActions(state.actionChoices);
    }),
    placeDie: (dieId, workId, slotIndex) => {
      let result = false;
      set((state) => {
        if (state.game) {
          const engine = session(
            state.game as GameState,
            state.mode,
            state.tutorial as TutorialRuntimeState | null,
            state.gameDefinition as GameDefinition,
          );
          result = placeDieWithLegality(engine, 'player', dieId, workId, slotIndex);
        }
      });
      return result;
    },
    finishPlayerAssignment: () => set((state) => {
      if (!state.game) return;
      const gameDefinition = state.gameDefinition as GameDefinition;
      session(
        state.game as GameState,
        state.mode,
        state.tutorial as TutorialRuntimeState | null,
        gameDefinition,
      ).finishPlayerAssignment();
      state.actionChoices = defaultChoices(state.game as GameState, gameDefinition);
    }),
    playCard: (teamId, instanceId, target = {}) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(
            state.game as GameState,
            state.mode,
            state.tutorial as TutorialRuntimeState | null,
            state.gameDefinition as GameDefinition,
          ).playCard(teamId, instanceId, target);
        }
      });
      return result;
    },
    discardCards: (teamId, instanceIds) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(
            state.game as GameState,
            state.mode,
            state.tutorial as TutorialRuntimeState | null,
            state.gameDefinition as GameDefinition,
          ).discardCards(teamId, instanceIds);
        }
      });
      return result;
    },
    activateSkill: (teamId, memberId, skillId, target = {}) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(
            state.game as GameState,
            state.mode,
            state.tutorial as TutorialRuntimeState | null,
            state.gameDefinition as GameDefinition,
          ).activateSkill(teamId, memberId, skillId, target);
        }
      });
      return result;
    },
  })),
);
