import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import type { GameDefinition, MatchRules } from '../game/gameDefinition';
import type { TeamId, WorkType } from '../game/schema';
import type { ActionChoice, GameState, Phase, SkillActivationTarget } from '../game/types';
import type { OnlineDraftState } from './onlineDraft';
import type { OnlineRopeTimer, OnlineTimeoutNotice } from './onlineRope';

export const ONLINE_PROTOCOL_VERSION = 3;

export type OnlineCommand =
  | { type: 'performActions'; actions: Record<string, ActionChoice> }
  | { type: 'placeDie'; dieId: string; workId: string; slotIndex: number }
  | { type: 'finishAssignment' }
  | { type: 'playCard'; instanceId: string; target?: SkillActivationTarget }
  | { type: 'discardCards'; instanceIds: string[] }
  | { type: 'activateSkill'; memberId: string; skillId: string; target?: SkillActivationTarget };

export interface OnlineDefinitionSnapshot {
  id: string;
  rules: MatchRules;
  deck: string[];
  roster: { excludedCharacterIds: string[] };
}

export type OnlineMessage =
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'snapshot';
      game: GameState;
      definition: OnlineDefinitionSnapshot;
      timer: OnlineRopeTimer | null;
      hostNow: number;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'command';
      command: OnlineCommand;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'planPreview';
      actions: Record<string, ActionChoice>;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'draft';
      draft: OnlineDraftState;
      timer: OnlineRopeTimer | null;
      hostNow: number;
      hostTeamName: string;
      guestTeamName?: string;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'draftReady';
      teamName: string;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'draftPick';
      characterId: string;
      teamName?: string;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'workTypes';
      selections: Record<string, WorkType>;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'timeout';
      notice: OnlineTimeoutNotice;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'error';
      message: string;
    };

export function snapshotDefinition(definition: GameDefinition): OnlineDefinitionSnapshot {
  return {
    id: definition.id,
    rules: { ...definition.rules, player: { ...definition.rules.player }, enemy: { ...definition.rules.enemy } },
    deck: [...definition.deck],
    roster: { excludedCharacterIds: [...definition.roster.excludedCharacterIds] },
  };
}

export function restoreDefinition(snapshot: OnlineDefinitionSnapshot): GameDefinition {
  return {
    ...snapshot,
    content: STANDARD_GAME_DEFINITION.content,
  };
}

function swapTeamId(teamId: TeamId): TeamId {
  return teamId === 'player' ? 'enemy' : 'player';
}

function swapPhase(phase: Phase): Phase {
  switch (phase) {
    case 'player-plan': return 'enemy-plan';
    case 'player-assign': return 'enemy-assign';
    case 'enemy-plan': return 'player-plan';
    case 'enemy-assign': return 'player-assign';
    case 'finished': return 'finished';
  }
}

function swapAnchor(anchor: string | undefined): string | undefined {
  if (anchor === 'hand:player') return 'hand:enemy';
  if (anchor === 'hand:enemy') return 'hand:player';
  return anchor;
}

/**
 * The authoritative Host always stores Host as `player` and Guest as `enemy`.
 * BattleRoom remains local-player-oriented, so Guest snapshots swap the two teams
 * and phase labels before entering its local store. No gameplay rule uses the
 * presentation-only labels after the snapshot is received.
 */
export function swapGamePerspective(source: GameState): GameState {
  const game = JSON.parse(JSON.stringify(source)) as GameState;
  const host = game.player;
  const guest = game.enemy;

  game.player = { ...guest, id: 'player', name: source.enemy.name };
  game.enemy = { ...host, id: 'enemy', name: source.player.name };
  game.phase = swapPhase(source.phase);
  if (source.winner === 'player' || source.winner === 'enemy') game.winner = swapTeamId(source.winner);

  if (game.feedback) {
    game.feedback = game.feedback.map((entry) => ({
      ...entry,
      teamId: swapTeamId(entry.teamId),
      impacts: entry.impacts.map((impact) => ({
        ...impact,
        anchor: swapAnchor(impact.anchor) ?? impact.anchor,
        fallbackAnchor: swapAnchor(impact.fallbackAnchor),
      })),
    }));
  }

  return game;
}
