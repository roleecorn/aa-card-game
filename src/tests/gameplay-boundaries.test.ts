import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession, selectStandardRosters } from '../game/engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from '../game/statuses';
import type { GameState } from '../game/types';
import { createSkillHarness, SKILL_FIXTURES } from './helpers/skillHarness';

const FORBIDDEN_BEHAVIOR_TAGS = [
  'no-stress',
  'cannot-act',
  'coordination-untargetable',
  'coordination-disabled-as-leader',
  'not-standard-playable',
];

describe('gameplay state boundaries', () => {
  it('lets AI place higher Text and AA dice after filling their prerequisites', () => {
    const { game, engine } = createSkillHarness();
    game.phase = 'player-assign';
    const ownerId = SKILL_FIXTURES.enemyA;
    const work = game.enemy.works.find((candidate) => candidate.ownerId === ownerId)!;
    engine.grantDice('enemy', ownerId, 'aa', 1, 'test', false, 6);
    engine.grantDice('enemy', ownerId, 'text', 1, 'test', false, 5);
    const design = engine.grantDice('enemy', ownerId, 'design', 1, 'test', false)[0]!;
    for (const member of game.enemy.members) member.stress = 5;

    engine.finishPlayerAssignment();

    expect(work.slots[0]).toEqual({ design: design.value, text: 5, aa: 6 });
    expect(game.round).toBe(2);
  });

  it('keeps gameplay behavior out of character tags and assigns behavior skills explicitly', () => {
    for (const character of Object.values(CHARACTERS)) {
      for (const tag of FORBIDDEN_BEHAVIOR_TAGS) {
        expect(character.tags ?? []).not.toContain(tag);
      }
    }

    expect(CHARACTERS.chaos?.tags).toEqual(['boss']);
    expect(CHARACTERS.chaos?.skillIds).toContain('chaosStressImmunity');
    expect(CHARACTERS.weakzhi?.skillIds).toContain('weakzhiRestrictions');
    expect(SKILLS.triangleRecovery?.activeTarget).toMatchObject({
      kind: 'taggedMember',
      tag: 'triangle-creature',
    });
  });

  it('keeps Standard roster eligibility in match configuration instead of tags or skill status', () => {
    const selected = selectStandardRosters(() => 0.5, STANDARD_GAME_DEFINITION);
    const selectionPool = [
      ...selected.playerMemberIds,
      ...selected.enemyMemberIds,
      ...selected.unusedMemberIds,
    ];

    expect(selectionPool).not.toContain('chaos');
    expect(selectionPool).toContain('narrator');
    expect(selectionPool).toContain('ginsakura');
    expect(STANDARD_GAME_DEFINITION.roster.excludedCharacterIds).toEqual(['chaos']);
  });

  it('allows explicit deterministic scenarios without reopening truly excluded characters to Standard selection', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['chaos', 'narrator', 'pintbox'],
      enemyMemberIds: ['mashiro', 'user79', 'bluewind'],
    });

    expect(game.player.members.map((member) => member.defId)).toEqual(['chaos', 'narrator', 'pintbox']);
    expect(STANDARD_GAME_DEFINITION.roster.excludedCharacterIds).toEqual(['chaos']);
  });

  it('applies Weakzhi gameplay restrictions through an explicitly assigned skill', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['weakzhi', 'pintbox', 'mashiro'],
      enemyMemberIds: ['bluewind', 'happy', 'yashiro'],
    });
    const weakzhi = game.player.members.find((member) => member.defId === 'weakzhi')!;

    expect(SKILLS.weakzhiRestrictions?.status).toBe('implemented');
    expect(hasGameplayStatus(weakzhi, GAMEPLAY_STATUS.actionBlocked)).toBe(true);
    expect(hasGameplayStatus(weakzhi, GAMEPLAY_STATUS.coordinationUntargetable)).toBe(true);
    expect(hasGameplayStatus(weakzhi, GAMEPLAY_STATUS.coordinationDisabledAsLeader)).toBe(true);
  });

  it('applies Chaos stress immunity through an explicitly assigned skill', () => {
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
    const engine = new EngineSession(state, () => 0.5, STANDARD_GAME_DEFINITION);

    engine.start();
    const chaos = state.player.members[0]!;
    expect(SKILLS.chaosStressImmunity?.status).toBe('implemented');
    expect(hasGameplayStatus(chaos, GAMEPLAY_STATUS.stressImmune)).toBe(true);

    engine.adjustStress('player', 'chaos', 3, 'test');
    expect(chaos.stress).toBe(0);
  });
});
