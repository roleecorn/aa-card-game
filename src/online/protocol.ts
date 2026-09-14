import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import type { GameDefinition, MatchRules } from '../game/gameDefinition';
import type { TeamId } from '../game/schema';
import type { ActionChoice, GameState, Phase, SkillActivationTarget } from '../game/types';

export const ONLINE_PROTOCOL_VERSION = 1;

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
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'command';
      command: OnlineCommand;
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

  game.player = { ...guest, id: 'player', name: source.player.name };
  game.enemy = { ...host, id: 'enemy', name: source.enemy.name };
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

export function encodeSignal(description: RTCSessionDescriptionInit): string {
  const json = JSON.stringify({ type: description.type, sdp: description.sdp });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeSignal(code: string): RTCSessionDescriptionInit {
  const binary = atob(code.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as RTCSessionDescriptionInit;
  if ((parsed.type !== 'offer' && parsed.type !== 'answer') || !parsed.sdp) throw new Error('Invalid WebRTC connection code.');
  return parsed;
}
