import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['weakzhi', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('弱智 complete character package', () => {
  it('uses the PintBox-defined stats, affinity and runtime assets', () => {
    expect(CHARACTERS.weakzhi?.stats).toEqual({ design: 1, text: 1, aa: 1 });
    expect(CHARACTERS.weakzhi?.maxStress).toBe(5);
    expect(CHARACTERS.weakzhi?.affinities).toEqual(['笑']);
    expect(CHARACTERS.weakzhi?.portrait).toBe('/assets/characters/portrait/weakzhi.webp');
    expect(CHARACTERS.weakzhi?.compactPortrait).toBe('/assets/characters/compact/weakzhi.webp');
    expect(SKILLS.weakzhiFinalRush?.status).toBe('implemented');
    expect(SKILLS.weakzhiRestrictions?.status).toBe('implemented');
  });

  it('cannot take work or slack actions', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);

    engine.performPlayerActions({ weakzhi: 'work', pintbox: 'slack', mashiro: 'slack' });

    expect(game.player.members.find((member) => member.defId === 'weakzhi')?.stress).toBe(0);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'weakzhi')).toBe(false);
  });

  it('cannot be selected by a coordination card', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    game.player.hand = [{ instanceId: 'soothe-test', cardId: 'soothe' }];

    expect(engine.playCard('player', 'soothe-test', { memberId: 'weakzhi' })).toBe(false);
    expect(game.player.hand).toHaveLength(1);
  });

  it('cannot use coordination cards while serving as leader', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    game.player.leaderId = 'weakzhi';
    game.player.hand = [{ instanceId: 'soothe-test', cardId: 'soothe' }];
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);

    expect(engine.playCard('player', 'soothe-test', { memberId: 'pintbox' })).toBe(false);
    expect(game.player.hand).toHaveLength(1);
  });

  it('rolls an independent d6 for every remaining progress cell before final scoring', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    game.round = game.maxRounds;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'weakzhi')!;
    work.slots[0]!.design = 6;
    const engine = new EngineSession(game, () => 0, STANDARD_GAME_DEFINITION);

    engine.skills.emit({ type: 'roundEnd' });

    expect(work.slots[0]!.design).toBe(6);
    const cells = work.slots.flatMap((slot) => [slot.design, slot.text, slot.aa]);
    expect(cells).toHaveLength(15);
    expect(cells.every((value) => value !== undefined)).toBe(true);
    expect(cells.filter((value) => value === 1)).toHaveLength(14);
  });
});
