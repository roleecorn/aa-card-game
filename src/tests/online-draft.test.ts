import { describe, expect, it } from 'vitest';
import {
  applyOnlineDraftPick,
  createOnlineDraft,
  draftBatchSizes,
  draftTurn,
  type OnlineDraftState,
} from '../online/onlineDraft';
import dialogSource from '../components/OnlineConnectionDialog.tsx?raw';
import appSource from '../app/App.tsx?raw';

function deterministicDraft(teamSize: 3 | 5): OnlineDraftState {
  const ids = Array.from({ length: teamSize * 2 }, (_, index) => `c${index + 1}`);
  return createOnlineDraft(teamSize, ids, () => 0.999999);
}

function pick(state: OnlineDraftState, side: 'host' | 'guest', id: string): OnlineDraftState {
  const next = applyOnlineDraftPick(state, side, id);
  expect(next).not.toBeNull();
  return next!;
}

describe('online character draft', () => {
  it('uses 1-2-2-1 for the 3-player mode and gives both sides three characters', () => {
    expect(draftBatchSizes(3)).toEqual([1, 2, 2, 1]);
    let draft = deterministicDraft(3);
    const [a, b, c, d, e, f] = draft.poolIds;

    expect(draftTurn(draft)).toMatchObject({ side: 'host', remainingInBatch: 1 });
    draft = pick(draft, 'host', a!);
    expect(draftTurn(draft)).toMatchObject({ side: 'guest', remainingInBatch: 2 });
    draft = pick(draft, 'guest', b!);
    draft = pick(draft, 'guest', c!);
    expect(draftTurn(draft)).toMatchObject({ side: 'host', remainingInBatch: 2 });
    draft = pick(draft, 'host', d!);
    draft = pick(draft, 'host', e!);
    expect(draftTurn(draft)).toMatchObject({ side: 'guest', remainingInBatch: 1 });
    draft = pick(draft, 'guest', f!);

    expect(draft.status).toBe('complete');
    expect(draft.hostPicks).toEqual([a, d, e]);
    expect(draft.guestPicks).toEqual([b, c, f]);
  });

  it('uses 1-2-2-2-2-1 for the 5-player mode and gives both sides five characters', () => {
    expect(draftBatchSizes(5)).toEqual([1, 2, 2, 2, 2, 1]);
    let draft = deterministicDraft(5);
    const ids = draft.poolIds;
    const expectedSides: Array<'host' | 'guest'> = ['host', 'guest', 'guest', 'host', 'host', 'guest', 'guest', 'host', 'host', 'guest'];

    expectedSides.forEach((side, index) => {
      draft = pick(draft, side, ids[index]!);
    });

    expect(draft.status).toBe('complete');
    expect(draft.hostPicks).toHaveLength(5);
    expect(draft.guestPicks).toHaveLength(5);
    expect(draft.hostPicks[0]).toBe(ids[0]);
    expect(draft.guestPicks[0]).toBe(ids[1]);
  });

  it('rejects out-of-turn and already-picked characters', () => {
    let draft = deterministicDraft(3);
    const first = draft.poolIds[0]!;
    expect(applyOnlineDraftPick(draft, 'guest', first)).toBeNull();
    draft = pick(draft, 'host', first);
    expect(applyOnlineDraftPick(draft, 'guest', first)).toBeNull();
  });

  it('chooses the host mode before room creation and routes online play away from the AI reroll screen', () => {
    expect(dialogSource).not.toContain('先選擇對戰模式');
    expect(dialogSource).toContain('createRoom(3)');
    expect(dialogSource).toContain('createRoom(5)');
    expect(dialogSource).toContain('createHostRoom(size, confirmedTeamName)');
    expect(appSource).toContain("'online-draft'");
    expect(appSource).toContain("'online-work-types'");
    expect(appSource).toContain('<OnlineDraftScreen');
    expect(appSource).toContain('<WorkTypeSelectionScreen');
    expect(appSource).toContain('onlineDraft.hostPicks[0]');
  });
});
