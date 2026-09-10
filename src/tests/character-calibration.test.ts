import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

describe('2026-09-10 character card calibration', () => {
  it('uses the calibrated affinities and base stats', () => {
    expect(CHARACTERS.pintbox?.affinities).toEqual(['謀']);
    expect(CHARACTERS.ginsakura?.affinities).toEqual(['燃']);
    expect(CHARACTERS.bluewind?.affinities).toEqual(['情']);
    expect(CHARACTERS.happy?.affinities).toEqual(['怪']);
    expect(CHARACTERS.chaos?.affinities).toEqual(['情', '謀', '笑']);
    expect(CHARACTERS.meteor?.affinities).toEqual(['燃']);
    expect(CHARACTERS.yashiro?.affinities).toEqual(['情']);
    expect(CHARACTERS.lemon?.affinities).toEqual(['謀']);
    expect(CHARACTERS.emotion?.affinities).toEqual(['情']);
    expect(CHARACTERS.emotion?.stats.aa).toBe(2);
    expect(CHARACTERS.kitsu?.affinities).toEqual(['笑', '怪']);
    expect(CHARACTERS.grimm?.stats.aa).toBe(3);
    expect(CHARACTERS.grimm?.affinities).toEqual(['情', '燃', '笑']);
    expect(CHARACTERS.pigeon?.affinities).toEqual(['燃', '謀', '笑', '情', '怪']);
    expect(CHARACTERS.tanxi?.stats).toEqual({ design: 1, text: 0, aa: 0 });
    expect(CHARACTERS.ghostshadow?.stats.aa).toBe(0);
    expect(CHARACTERS.patrick?.stats).toEqual({ design: 0, text: 0, aa: 0 });
    expect(CHARACTERS.patrick?.maxStress).toBe(3);
    expect(CHARACTERS.patrick?.affinities).toEqual([]);
    expect(CHARACTERS.patrick?.skillIds).toEqual([]);
  });

  it('moves 虛之會圈 from 79 to 藍風', () => {
    expect(CHARACTERS.user79?.skillIds).not.toContain('virtualCircle79');
    expect(CHARACTERS.user79?.skillIds).toContain('burningText79');
    expect(CHARACTERS.bluewind?.skillIds).toContain('virtualCircle');
    expect(SKILLS.virtualCircle?.name).toBe('虛之會圈');
  });

  it('79 spends one stress to add two to a selected Text die', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, {
      playerMemberIds: ['user79', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, () => 0.5);
    const die = engine.grantDice('player', 'user79', 'text', 1, 'test', false, 3)[0]!;
    die.value = 3;

    expect(engine.activateSkill('player', 'user79', 'burningText79', { targetDieId: die.id })).toBe(true);
    expect(die.value).toBe(5);
    expect(engine.getCharacter('player', 'user79')?.stress).toBe(1);
  });

  it('火場救援 grants three dice that can fill another ally work', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, {
      playerMemberIds: ['lemon', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, () => 0.5);
    const before = game.player.pendingDice.length;

    expect(engine.activateSkill('player', 'lemon', 'lemonFireRescue')).toBe(true);
    expect(engine.getCharacter('player', 'lemon')?.stress).toBe(1);

    const rescueDice = game.player.pendingDice.slice(before);
    expect(rescueDice).toHaveLength(3);
    expect(rescueDice.map((die) => die.skill)).toEqual(['design', 'text', 'aa']);

    const allyWork = game.player.works.find((work) => work.ownerId === 'pintbox')!;
    expect(engine.placeDie('player', rescueDice[0]!.id, allyWork.id, 0)).toBe(true);
    expect(engine.placeDie('player', rescueDice[1]!.id, allyWork.id, 0)).toBe(true);
    expect(engine.placeDie('player', rescueDice[2]!.id, allyWork.id, 0)).toBe(true);
    expect(allyWork.slots[0]).toMatchObject({ design: 4, text: 4, aa: 4 });

    expect(engine.activateSkill('player', 'lemon', 'lemonFireRescue')).toBe(false);
  });
});