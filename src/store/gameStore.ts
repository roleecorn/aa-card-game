import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_MATCH } from '../content/catalog';
import { EngineSession, createInitialGame } from '../game/engine';
import { GAMEPLAY_STATUS } from '../game/statuses';
import type { ActionChoice, GameState, SkillActivationTarget } from '../game/types';
import type { TeamId } from '../game/schema';
import { createTutorialGame, createTutorialSession, resetTutorialRuntime } from '../tutorial/runtime';

type GameMode = 'standard' | 'tutorial';

interface GameStore {
  game: GameState | null;
  mode: GameMode;
  actionChoices: Record<string, ActionChoice>;
  reset: () => void;
  startGame: (playerMemberIds: string[], enemyMemberIds: string[], playerLeaderId?: string) => void;
  startTutorial: () => void;
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

function applyLeaderStressBonuses(game: GameState): void {
  for (const team of [game.player, game.enemy]) {
    const leader = team.members.find((member) => member.defId === team.leaderId);
    if (!leader) continue;
    leader.statuses[GAMEPLAY_STATUS.leaderStressCapBonus] = {
      stacks: DEFAULT_MATCH.leaderStressBonus,
    };
  }
}

export function actionChoicesForCurrentStress(
  game: GameState,
  requestedChoices: Record<string, ActionChoice> = {},
): Record<string, ActionChoice> {
  const engine = new EngineSession(game);
  return Object.fromEntries(game.player.members.map((member) => [
    member.defId,
    engine.isAtStressCap('player', member.defId) ? 'slack' : requestedChoices[member.defId] ?? 'work',
  ])) as Record<string, ActionChoice>;
}

function defaultChoices(game: GameState): Record<string, ActionChoice> {
  return actionChoicesForCurrentStress(game);
}

function session(game: GameState, mode: GameMode): EngineSession {
  return mode === 'tutorial' ? createTutorialSession(game) : new EngineSession(game);
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    game: null,
    mode: 'standard',
    actionChoices: {},
    reset: () => set((state) => {
      resetTutorialRuntime();
      state.game = null;
      state.mode = 'standard';
      state.actionChoices = {};
    }),
    startGame: (playerMemberIds, enemyMemberIds, requestedLeaderId) => set((state) => {
      resetTutorialRuntime();

      const selectedLeaderId = requestedLeaderId && playerMemberIds.includes(requestedLeaderId)
        ? requestedLeaderId
        : playerMemberIds[0];
      const orderedPlayerMemberIds = moveLeaderFirst(playerMemberIds, selectedLeaderId);

      state.mode = 'standard';
      state.game = createInitialGame(Math.random, undefined, {
        playerMemberIds: orderedPlayerMemberIds,
        enemyMemberIds,
      });
      applyLeaderStressBonuses(state.game as GameState);
      state.actionChoices = defaultChoices(state.game as GameState);
    }),
    startTutorial: () => set((state) => {
      const game = createTutorialGame();
      state.mode = 'tutorial';
      state.game = game;
      state.actionChoices = defaultChoices(game);
    }),
    setActionChoice: (memberId, action) => set((state) => {
      state.actionChoices[memberId] = action;
    }),
    performPlayerActions: () => set((state) => {
      if (!state.game) return;
      state.actionChoices = actionChoicesForCurrentStress(state.game as GameState, state.actionChoices);
      session(state.game as GameState, state.mode).performPlayerActions(state.actionChoices);
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
    playCard: (teamId, instanceId, target = {}) => {
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
