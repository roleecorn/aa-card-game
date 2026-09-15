import { describe, expect, it } from 'vitest';
import ropeStatusSource from '../components/OnlineRopeStatus.tsx?raw';
import type { GameState } from '../game/types';
import type { OnlineDraftState } from '../online/onlineDraft';
import {
  ONLINE_BATTLE_PHASE_MS,
  ONLINE_DRAFT_TURN_MS,
  ONLINE_ROPE_WARNING_MS,
  autoCompleteDraftBatch,
  createBattleRopeTimer,
  createDraftRopeTimer,
  localizeRemoteRopeTimer,
  ropeIsWarning,
  ropeRemainingSeconds,
} from '../online/onlineRope';

describe('online rope timer', () => {
  it('uses the agreed draft, battle, and warning durations', () => {
    expect(ONLINE_DRAFT_TURN_MS).toBe(15_000);
    expect(ONLINE_BATTLE_PHASE_MS).toBe(90_000);
    expect(ONLINE_ROPE_WARNING_MS).toBe(10_000);
  });

  it('creates one 15 second timer for the whole draft batch', () => {
    const draft: OnlineDraftState = {
      teamSize: 3,
      poolIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      hostPicks: ['a'],
      guestPicks: [],
      batchIndex: 1,
      pickedInBatch: 0,
      status: 'drafting',
    };

    const timer = createDraftRopeTimer(draft, 1_000);
    expect(timer).toMatchObject({
      id: 'draft:1',
      kind: 'draft',
      side: 'guest',
      durationMs: 15_000,
      deadlineAt: 16_000,
    });
  });

  it('auto-picks first available characters until the current batch is complete', () => {
    const draft: OnlineDraftState = {
      teamSize: 3,
      poolIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      hostPicks: ['a'],
      guestPicks: [],
      batchIndex: 1,
      pickedInBatch: 0,
      status: 'drafting',
    };

    const result = autoCompleteDraftBatch(draft);
    expect(result.pickedIds).toEqual(['b', 'c']);
    expect(result.draft.guestPicks).toEqual(['b', 'c']);
    expect(result.draft.batchIndex).toBe(2);
    expect(result.draft.pickedInBatch).toBe(0);
  });

  it('only fills the missing pick when a two-pick batch is partly complete', () => {
    const draft: OnlineDraftState = {
      teamSize: 3,
      poolIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      hostPicks: ['a'],
      guestPicks: ['b'],
      batchIndex: 1,
      pickedInBatch: 1,
      status: 'drafting',
    };

    const result = autoCompleteDraftBatch(draft);
    expect(result.pickedIds).toEqual(['c']);
    expect(result.draft.guestPicks).toEqual(['b', 'c']);
    expect(result.draft.batchIndex).toBe(2);
  });

  it('gives every battle phase a fresh 90 second deadline', () => {
    const planGame = { round: 2, phase: 'player-plan' } as GameState;
    const assignGame = { round: 2, phase: 'player-assign' } as GameState;

    const plan = createBattleRopeTimer(planGame, 5_000);
    const assign = createBattleRopeTimer(assignGame, 20_000);

    expect(plan).toMatchObject({
      id: 'battle:2:player-plan',
      side: 'host',
      durationMs: 90_000,
      deadlineAt: 95_000,
    });
    expect(assign).toMatchObject({
      id: 'battle:2:player-assign',
      side: 'host',
      durationMs: 90_000,
      deadlineAt: 110_000,
    });
  });

  it('localizes Host remaining time instead of trusting equal wall clocks', () => {
    const timer = {
      id: 'battle:1:enemy-plan',
      kind: 'battle' as const,
      side: 'guest' as const,
      phase: 'enemy-plan' as const,
      durationMs: 90_000,
      deadlineAt: 190_000,
    };

    const localized = localizeRemoteRopeTimer(timer, 100_000, 5_000);
    expect(localized?.deadlineAt).toBe(95_000);
    expect(ropeRemainingSeconds(localized!, 85_001)).toBe(10);
    expect(ropeIsWarning(localized!, 85_001)).toBe(true);
    expect(ropeIsWarning(localized!, 84_999)).toBe(false);
  });

  it('blocks Host battle UI input after the authoritative deadline', () => {
    expect(ropeStatusSource).toContain("role !== 'host' || timer?.kind !== 'battle'");
    expect(ropeStatusSource).toContain('current.deadlineAt > Date.now()');
    expect(ropeStatusSource).toContain("document.addEventListener('pointerdown', blockExpiredInteraction, true)");
    expect(ropeStatusSource).toContain('event.stopImmediatePropagation()');
  });
});
