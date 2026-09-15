import type { GameState, Phase } from '../game/types';
import {
  applyOnlineDraftPick,
  draftTurn,
  type OnlineDraftSide,
  type OnlineDraftState,
} from './onlineDraft';

export const ONLINE_DRAFT_TURN_MS = 15_000;
export const ONLINE_BATTLE_PHASE_MS = 90_000;
export const ONLINE_ROPE_WARNING_MS = 10_000;

export type OnlineRopeKind = 'draft' | 'battle';

export interface OnlineRopeTimer {
  id: string;
  kind: OnlineRopeKind;
  side: OnlineDraftSide;
  phase?: Exclude<Phase, 'finished'>;
  durationMs: number;
  deadlineAt: number;
}

export interface OnlineTimeoutNotice {
  id: string;
  title: string;
  message: string;
  createdAt: number;
}

export function battleSideForPhase(phase: Phase): OnlineDraftSide | null {
  if (phase === 'player-plan' || phase === 'player-assign') return 'host';
  if (phase === 'enemy-plan' || phase === 'enemy-assign') return 'guest';
  return null;
}

export function createDraftRopeTimer(
  draft: OnlineDraftState,
  now = Date.now(),
): OnlineRopeTimer | null {
  const turn = draftTurn(draft);
  if (!turn) return null;
  return {
    id: `draft:${draft.batchIndex}`,
    kind: 'draft',
    side: turn.side,
    durationMs: ONLINE_DRAFT_TURN_MS,
    deadlineAt: now + ONLINE_DRAFT_TURN_MS,
  };
}

export function createBattleRopeTimer(
  game: GameState,
  now = Date.now(),
): OnlineRopeTimer | null {
  const side = battleSideForPhase(game.phase);
  if (!side || game.phase === 'finished') return null;
  return {
    id: `battle:${game.round}:${game.phase}`,
    kind: 'battle',
    side,
    phase: game.phase,
    durationMs: ONLINE_BATTLE_PHASE_MS,
    deadlineAt: now + ONLINE_BATTLE_PHASE_MS,
  };
}

export function localizeRemoteRopeTimer(
  timer: OnlineRopeTimer | null,
  hostNow: number,
  localNow = Date.now(),
): OnlineRopeTimer | null {
  if (!timer) return null;
  return {
    ...timer,
    deadlineAt: localNow + Math.max(0, timer.deadlineAt - hostNow),
  };
}

export function ropeRemainingMs(timer: OnlineRopeTimer, now = Date.now()): number {
  return Math.max(0, timer.deadlineAt - now);
}

export function ropeRemainingSeconds(timer: OnlineRopeTimer, now = Date.now()): number {
  return Math.max(0, Math.ceil(ropeRemainingMs(timer, now) / 1000));
}

export function ropeIsWarning(timer: OnlineRopeTimer, now = Date.now()): boolean {
  const remaining = ropeRemainingMs(timer, now);
  return remaining > 0 && remaining <= ONLINE_ROPE_WARNING_MS;
}

export function autoCompleteDraftBatch(
  draft: OnlineDraftState,
): { draft: OnlineDraftState; pickedIds: string[] } {
  const initialBatchIndex = draft.batchIndex;
  let next = draft;
  const pickedIds: string[] = [];

  while (next.status === 'drafting' && next.batchIndex === initialBatchIndex) {
    const turn = draftTurn(next);
    if (!turn) break;
    const picked = new Set([...next.hostPicks, ...next.guestPicks]);
    const firstAvailable = next.poolIds.find((id) => !picked.has(id));
    if (!firstAvailable) break;
    const applied = applyOnlineDraftPick(next, turn.side, firstAvailable);
    if (!applied) break;
    pickedIds.push(firstAvailable);
    next = applied;
  }

  return { draft: next, pickedIds };
}
