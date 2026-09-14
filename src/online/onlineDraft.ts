export type OnlineTeamSize = 3 | 5;
export type OnlineDraftSide = 'host' | 'guest';

export interface OnlineDraftState {
  teamSize: OnlineTeamSize;
  poolIds: string[];
  hostPicks: string[];
  guestPicks: string[];
  batchIndex: number;
  pickedInBatch: number;
  status: 'drafting' | 'complete';
}

export interface OnlineDraftTurn {
  side: OnlineDraftSide;
  batchSize: number;
  remainingInBatch: number;
}

export function draftBatchSizes(teamSize: OnlineTeamSize): number[] {
  return teamSize === 3 ? [1, 2, 2, 1] : [1, 2, 2, 2, 2, 1];
}

export function draftTurn(state: OnlineDraftState): OnlineDraftTurn | null {
  if (state.status === 'complete') return null;
  const batches = draftBatchSizes(state.teamSize);
  const batchSize = batches[state.batchIndex];
  if (!batchSize) return null;
  return {
    side: state.batchIndex % 2 === 0 ? 'host' : 'guest',
    batchSize,
    remainingInBatch: batchSize - state.pickedInBatch,
  };
}

export function createOnlineDraft(
  teamSize: OnlineTeamSize,
  playableIds: string[],
  rng: () => number = Math.random,
): OnlineDraftState {
  const required = teamSize * 2;
  if (new Set(playableIds).size < required) {
    throw new Error(`Online ${teamSize}-player draft requires at least ${required} unique playable characters.`);
  }

  const shuffled = [...new Set(playableIds)];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return {
    teamSize,
    poolIds: shuffled.slice(0, required),
    hostPicks: [],
    guestPicks: [],
    batchIndex: 0,
    pickedInBatch: 0,
    status: 'drafting',
  };
}

export function applyOnlineDraftPick(
  state: OnlineDraftState,
  side: OnlineDraftSide,
  characterId: string,
): OnlineDraftState | null {
  const turn = draftTurn(state);
  if (!turn || turn.side !== side) return null;
  if (!state.poolIds.includes(characterId)) return null;
  if (state.hostPicks.includes(characterId) || state.guestPicks.includes(characterId)) return null;

  const next: OnlineDraftState = {
    ...state,
    poolIds: [...state.poolIds],
    hostPicks: [...state.hostPicks],
    guestPicks: [...state.guestPicks],
  };
  (side === 'host' ? next.hostPicks : next.guestPicks).push(characterId);
  next.pickedInBatch += 1;

  if (next.pickedInBatch >= turn.batchSize) {
    next.batchIndex += 1;
    next.pickedInBatch = 0;
  }

  if (next.hostPicks.length === next.teamSize && next.guestPicks.length === next.teamSize) {
    next.status = 'complete';
  }
  return next;
}
