import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { EngineSession, createInitialGame } from '../game/engine';
import type { ActionChoice, GameState, SkillActivationTarget } from '../game/types';
import type { TeamId } from '../game/schema';

interface GameStore {
  game: GameState | null;
  actionChoices: Record<string, ActionChoice>;
  reset: () => void;
  startGame: (playerMemberIds: string[], enemyMemberIds: string[]) => void;
  setActionChoice: (memberId: string, action: ActionChoice) => void;
  performPlayerActions: () => void;
  placeDie: (dieId: string, workId: string, slotIndex: number) => boolean;
  finishPlayerAssignment: () => void;
  playCard: (teamId: TeamId, instanceId: string, target: SkillActivationTarget) => boolean;
  activateSkill: (teamId: TeamId, memberId: string, skillId: string, target?: SkillActivationTarget) => boolean;
}

function defaultChoices(game: GameState): Record<string, ActionChoice> {
  return Object.fromEntries(game.player.members.map((member) => [member.defId, 'work'])) as Record<string, ActionChoice>;
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    game: null,
    actionChoices: {},
    reset: () => set((state) => {
      state.game = null;
      state.actionChoices = {};
    }),
    startGame: (playerMemberIds, enemyMemberIds) => set((state) => {
      state.game = createInitialGame(Math.random, undefined, { playerMemberIds, enemyMemberIds });
      state.actionChoices = defaultChoices(state.game);
    }),
    setActionChoice: (memberId, action) => set((state) => {
      state.actionChoices[memberId] = action;
    }),
    performPlayerActions: () => set((state) => {
      if (state.game) new EngineSession(state.game).performPlayerActions(state.actionChoices);
    }),
    placeDie: (dieId, workId, slotIndex) => {
      let result = false;
      set((state) => {
        if (state.game) result = new EngineSession(state.game).placeDie('player', dieId, workId, slotIndex);
      });
      return result;
    },
    finishPlayerAssignment: () => set((state) => {
      if (!state.game) return;
      new EngineSession(state.game).finishPlayerAssignment();
      state.actionChoices = defaultChoices(state.game);
    }),
    playCard: (teamId, instanceId, target) => {
      let result = false;
      set((state) => {
        if (state.game) result = new EngineSession(state.game).playCard(teamId, instanceId, target);
      });
      return result;
    },
    activateSkill: (teamId, memberId, skillId, target = {}) => {
      let result = false;
      set((state) => {
        if (state.game) result = new EngineSession(state.game).activateSkill(teamId, memberId, skillId, target);
      });
      return result;
    },
  })),
);
