import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { DieToken } from '../game/types';

const ROSTER = {
  playerMemberIds: ['tanxi', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('嘆息 complete character package', () => {
  it('uses the latest calibrated stats and production assets', () => {
    expect(CHARACTERS.tanxi?.stats).toEqual({ design: 1, text: 1, aa: 1 });
    expect(CHARACTERS.tanxi?.maxStress).toBe(3);
    expect(CHARACTERS.tanxi?.affinities).toEqual(['情']);
    expect(CHARACTERS.tanxi?.portrait).toBe('/assets/characters/portrait/tanxi.webp');
    expect(CHARACTERS.tanxi?.compactPortrait).toBe('/assets/characters/compact/tanxi.webp');
    expect(SKILLS.tanxiImmatureWriting?.status).toBe('implemented');
    expect(SKILLS.tanxiThinkHard?.status).toBe('implemented');
  });

  it('不成熟的文字 prevents Text and AA dice from remaining 5 or 6', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const dice: DieToken[] = [
      { id: 't', ownerId: 'tanxi', skill: 'text', value: 6, round: 1, origin: 'test' },
      { id: 'a', ownerId: 'tanxi', skill: 'aa', value: 5, round: 1, origin: 'test' },
      { id: 'd', ownerId: 'tanxi', skill: 'design', value: 6, round: 1, origin: 'test' },
    ];

    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'tanxi', dice, amount: dice.length, sourceKind: 'work' });

    expect(dice[0]?.value).toBeLessThanOrEqual(4);
    expect(dice[1]?.value).toBeLessThanOrEqual(4);
    expect(dice[2]?.value).toBe(6);
  });

  it('竭力思考 adds one stress and +2 to one selected die once per round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const die = engine.grantDice('player', 'tanxi', 'design', 1, 'test', false, 3)[0]!;
    die.value = 3;

    expect(engine.activateSkill('player', 'tanxi', 'tanxiThinkHard', { targetDieId: die.id })).toBe(true);
    expect(die.value).toBe(5);
    expect(engine.getCharacter('player', 'tanxi')?.stress).toBe(1);
    expect(engine.activateSkill('player', 'tanxi', 'tanxiThinkHard', { targetDieId: die.id })).toBe(false);
  });
});
