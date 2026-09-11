import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { EngineSession, applyLeaderStressBonuses, createInitialGame, selectStandardRosters } from '../game/engine';
import type { GameDefinition } from '../game/gameDefinition';

function fixedRng(value: number) {
  return () => value;
}

function compactDefinition(overrides: Partial<GameDefinition['rules']> = {}): GameDefinition {
  return {
    ...STANDARD_GAME_DEFINITION,
    id: 'compact-test',
    rules: {
      ...STANDARD_GAME_DEFINITION.rules,
      maxRounds: 2,
      teamSize: 2,
      initialHandSize: 1,
      cardsPerRound: 1,
      handLimit: 3,
      leaderStressBonus: 7,
      workLength: 3,
      missingWorkStatScore: -5,
      player: { name: 'Test Player' },
      enemy: { name: 'Test Enemy' },
      ...overrides,
    },
    deck: ['soothe', 'guide', 'polish'],
    roster: { excludedCharacterIds: [] },
  };
}

const TWO_V_TWO = {
  playerMemberIds: ['pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura'],
};

describe('injectable GameDefinition', () => {
  it('drives setup, deck, work shape and scoring from injected rules', () => {
    const definition = compactDefinition();
    const game = createInitialGame(fixedRng(0.5), definition, TWO_V_TWO);
    const engine = new EngineSession(game, fixedRng(0.5), definition);

    expect(game.maxRounds).toBe(2);
    expect(game.player.name).toBe('Test Player');
    expect(game.enemy.name).toBe('Test Enemy');
    expect(game.player.members).toHaveLength(2);
    expect(game.enemy.members).toHaveLength(2);
    expect(game.player.hand).toHaveLength(1);
    expect(game.player.deck).toHaveLength(2);
    expect(game.player.works.every((work) => work.length === 3 && work.slots.length === 3)).toBe(true);
    expect(engine.scoreWork(game.player.works[0]!)).toBe(-15);
  });

  it('uses injected leader bonus and hand limit instead of Standard constants', () => {
    const definition = compactDefinition();
    const game = createInitialGame(fixedRng(0.5), definition, TWO_V_TWO);
    applyLeaderStressBonuses(game, definition);
    const engine = new EngineSession(game, fixedRng(0.5), definition);

    const leaderId = game.player.leaderId;
    const baseMaxStress = definition.content.characters[leaderId]!.maxStress;
    expect(baseMaxStress).not.toBeNull();
    expect(engine.getEffectiveMaxStress('player', leaderId)).toBe((baseMaxStress ?? 0) + 7);

    game.player.hand = [
      { instanceId: 'a', cardId: 'soothe' },
      { instanceId: 'b', cardId: 'guide' },
      { instanceId: 'c', cardId: 'polish' },
      { instanceId: 'd', cardId: 'soothe' },
    ];
    expect(engine.discardCards('player', ['a'])).toBe(true);
    expect(game.player.hand).toHaveLength(3);
  });

  it('uses injected roster eligibility and team size', () => {
    const definition = {
      ...compactDefinition(),
      roster: { excludedCharacterIds: ['pintbox'] },
    } satisfies GameDefinition;

    const selected = selectStandardRosters(fixedRng(0.25), definition);
    const fielded = [...selected.playerMemberIds, ...selected.enemyMemberIds];

    expect(selected.playerMemberIds).toHaveLength(2);
    expect(selected.enemyMemberIds).toHaveLength(2);
    expect(fielded).not.toContain('pintbox');
  });
});
