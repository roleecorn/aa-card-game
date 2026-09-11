import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { EngineSession, applyLeaderStressBonuses, createInitialGame } from '../game/engine';
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
  mode: GameMode;
  tutorial: TutorialRuntimeState | null;
  actionChoices: Record<string, ActionChoice>;
  reset: () => void;
  startGame: (playerMemberIds: string[], enemyMemberIds: string[], playerLeaderId?: string) => void;
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
): Record<string, ActionChoice> {
  const engine = new EngineSession(game, Math.random, STANDARD_GAME_DEFINITION);
  return Object.fromEntries(game.player.members.map((member) => [
    member.defId,
    engine.isAtStressCap('player', member.defId) ? 'slack' : requestedChoices[member.defId] ?? 'work',
  ])) as Record<string, ActionChoice>;
}

function defaultChoices(game: GameState): Record<string, ActionChoice> {
  return actionChoicesForCurrentStress(game);
}

function session(game: GameState, mode: GameMode, tutorial: TutorialRuntimeState | null): EngineSession {
  if (mode === 'tutorial') {
    if (!tutorial) throw new Error('Tutorial mode requires tutorial runtime state.');
    return createTutorialSession(game, tutorial);
  }
  return new EngineSession(game, Math.random, STANDARD_GAME_DEFINITION);
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    game: null,
    mode: 'standard',
    tutorial: null,
    actionChoices: {},
    reset: () => set((state) => {
      state.game = null;
      state.mode = 'standard';
      state.tutorial = null;
      state.actionChoices = {};
    }),
    startGame: (playerMemberIds, enemyMemberIds, requestedLeaderId) => set((state) => {
      const selectedLeaderId = requestedLeaderId && playerMemberIds.includes(requestedLeaderId)
        ? requestedLeaderId
        : playerMemberIds[0];
      const orderedPlayerMemberIds = moveLeaderFirst(playerMemberIds, selectedLeaderId);

      state.mode = 'standard';
      state.tutorial = null;
      state.game = createInitialGame(Math.random, STANDARD_GAME_DEFINITION, {
        playerMemberIds: orderedPlayerMemberIds,
        enemyMemberIds,
      });
      applyLeaderStressBonuses(state.game as GameState, STANDARD_GAME_DEFINITION);
      state.actionChoices = defaultChoices(state.game as GameState);
    }),
    startTutorial: () => set((state) => {
      const game = createTutorialGame();
      applyLeaderStressBonuses(game, STANDARD_GAME_DEFINITION);
      state.mode = 'tutorial';
      state.tutorial = createTutorialRuntimeState();
      state.game = game;
      state.actionChoices = defaultChoices(game);
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
      state.actionChoices = actionChoicesForCurrentStress(state.game as GameState, state.actionChoices);
      session(state.game as GameState, state.mode, state.tutorial as TutorialRuntimeState | null).performPlayerActions(state.actionChoices);
    }),
    placeDie: (dieId, workId, slotIndex) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(state.game as GameState, state.mode, state.tutorial as TutorialRuntimeState | null)
            .placeDie('player', dieId, workId, slotIndex);
        }
      });
      return result;
    },
    finishPlayerAssignment: () => set((state) => {
      if (!state.game) return;
      session(state.game as GameState, state.mode, state.tutorial as TutorialRuntimeState | null).finishPlayerAssignment();
      state.actionChoices = defaultChoices(state.game as GameState);
    }),
    playCard: (teamId, instanceId, target = {}) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(state.game as GameState, state.mode, state.tutorial as TutorialRuntimeState | null)
            .playCard(teamId, instanceId, target);
        }
      });
      return result;
    },
    discardCards: (teamId, instanceIds) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(state.game as GameState, state.mode, state.tutorial as TutorialRuntimeState | null)
            .discardCards(teamId, instanceIds);
        }
      });
      return result;
    },
    activateSkill: (teamId, memberId, skillId, target = {}) => {
      let result = false;
      set((state) => {
        if (state.game) {
          result = session(state.game as GameState, state.mode, state.tutorial as TutorialRuntimeState | null)
            .activateSkill(teamId, memberId, skillId, target);
        }
      });
      return result;
    },
  })),
);
