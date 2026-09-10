import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { DieToken } from '../game/types';

const ROSTER = {
  playerMemberIds: ['lanyu', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function designDie(ownerId: string, value: number): DieToken {
  return { id: `die-${ownerId}-${value}`, ownerId, skill: 'design', value, round: 1, origin: '工作' };
}

describe('嵐羽 complete character package', () => {
  it('uses the PintBox-approved stats and implemented skills', () => {
    expect(CHARACTERS.lanyu?.stats).toEqual({ design: 1, text: 1, aa: 1 });
    expect(CHARACTERS.lanyu?.maxStress).toBe(3);
    expect(CHARACTERS.lanyu?.affinities).toEqual([]);
    expect(CHARACTERS.lanyu?.portrait).toBe('/assets/characters/portrait/lanyu.webp');
    expect(CHARACTERS.lanyu?.compactPortrait).toBe('/assets/characters/compact/lanyu.webp');
    expect(SKILLS.lanyuCommunication?.status).toBe('implemented');
    expect(SKILLS.lanyuTechnicalReserve?.status).toBe('implemented');
  });

  it('好溝通 grants one Design die when the allied leader rolls Design >= 4', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    game.player.leaderId = 'pintbox';
    game.player.pendingDice = [];
    const engine = new EngineSession(game, () => 0.5, DEFAULT_CONTENT);

    engine.skills.emit({
      type: 'afterRollBatch',
      teamId: 'player',
      actorId: 'pintbox',
      dice: [designDie('pintbox', 4), designDie('pintbox', 6)],
      amount: 2,
      sourceKind: 'work',
    });

    const dice = game.player.pendingDice.filter((die) => die.ownerId === 'lanyu');
    expect(dice).toHaveLength(1);
    expect(dice[0]?.skill).toBe('design');
    expect(dice[0]?.value).toBe(4);
  });

  it('好溝通 does not trigger for a non-leader, a low Design roll, or while 嵐羽 is leader', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.5, DEFAULT_CONTENT);
    game.player.pendingDice = [];
    game.player.leaderId = 'pintbox';

    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'mashiro', dice: [designDie('mashiro', 6)], amount: 1, sourceKind: 'work' });
    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'pintbox', dice: [designDie('pintbox', 3)], amount: 1, sourceKind: 'work' });
    game.player.leaderId = 'lanyu';
    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'lanyu', dice: [designDie('lanyu', 6)], amount: 1, sourceKind: 'work' });

    expect(game.player.pendingDice.filter((die) => die.ownerId === 'lanyu')).toHaveLength(0);
  });

  it('技術底力 adds one stress and one AA die, once per round', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    game.player.pendingDice = [];
    const engine = new EngineSession(game, () => 0.5, DEFAULT_CONTENT);
    const member = game.player.members.find((candidate) => candidate.defId === 'lanyu')!;

    expect(engine.activateSkill('player', 'lanyu', 'lanyuTechnicalReserve')).toBe(true);
    expect(member.stress).toBe(1);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'lanyu' && die.skill === 'aa')).toHaveLength(1);
    expect(engine.activateSkill('player', 'lanyu', 'lanyuTechnicalReserve')).toBe(false);
    expect(member.stress).toBe(1);
  });
});
