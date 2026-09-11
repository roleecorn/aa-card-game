import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession, selectStandardRosters } from '../game/engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from '../game/statuses';
import type { GameState } from '../game/types';

const LEGACY_BEHAVIOR_TAGS = [
  'no-stress',
  'cannot-act',
  'coordination-untargetable',
  'coordination-disabled-as-leader',
  'not-standard-playable',
];

describe('gameplay state boundaries', () => {
  it('keeps gameplay behavior out of runtime character tags', () => {
    for (const character of Object.values(CHARACTERS)) {
      for (const tag of LEGACY_BEHAVIOR_TAGS) {
        expect(character.tags ?? []).not.toContain(tag);
      }
    }

    expect(SKILLS.triangleRecovery?.activeTarget).toMatchObject({
      kind: 'taggedMember',
      tag: 'triangle-creature',
    });
  });

  it('keeps Standard roster eligibility in match configuration instead of tags', () => {
    const selected = selectStandardRosters(() => 0.5, DEFAULT_CONTENT);
    expect([
      ...selected.playerMemberIds,
      ...selected.enemyMemberIds,
      ...selected.unusedMemberIds,
    ]).not.toContain('chaos');
  });

  it('applies Weakzhi gameplay restrictions through a skill-created status', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, {
      playerMemberIds: ['weakzhi', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const weakzhi = game.player.members.find((member) => member.defId === 'weakzhi')!;

    expect(SKILLS.weakzhiRestrictions?.status).toBe('implemented');
    expect(hasGameplayStatus(weakzhi, GAMEPLAY_STATUS.actionBlocked)).toBe(true);
    expect(hasGameplayStatus(weakzhi, GAMEPLAY_STATUS.coordinationUntargetable)).toBe(true);
    expect(hasGameplayStatus(weakzhi, GAMEPLAY_STATUS.coordinationDisabledAsLeader)).toBe(true);
  });

  it('applies Chaos stress immunity through a skill rather than a tag', () => {
    const chaosDefinition = CHARACTERS.chaos!;
    const state: GameState = {
      round: 1,
      maxRounds: 5,
      phase: 'player-plan',
      player: {
        id: 'player',
        name: 'player',
        leaderId: 'chaos',
        members: [{
          defId: 'chaos',
          stress: 0,
          permanentStats: { ...chaosDefinition.stats },
          timedStatModifiers: [],
          skillUsage: {},
          statuses: {},
          resources: { 體力: 5 },
        }],
        works: [],
        hand: [],
        deck: [],
        discard: [],
        pendingDice: [],
      },
      enemy: {
        id: 'enemy',
        name: 'enemy',
        leaderId: '',
        members: [],
        works: [],
        hand: [],
        deck: [],
        discard: [],
        pendingDice: [],
      },
      logs: [],
    };
    const engine = new EngineSession(state, () => 0.5, DEFAULT_CONTENT);

    engine.start();
    const chaos = state.player.members[0]!;
    expect(SKILLS.chaosStressImmunity?.status).toBe('implemented');
    expect(hasGameplayStatus(chaos, GAMEPLAY_STATUS.stressImmune)).toBe(true);

    engine.adjustStress('player', 'chaos', 3, 'test');
    expect(chaos.stress).toBe(0);
  });
});
