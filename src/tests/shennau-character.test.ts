import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['shennau', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('神惱 complete character package', () => {
  it('uses the PintBox-approved stats and skills', () => {
    expect(CHARACTERS.shennau?.stats).toEqual({ design: 1, text: 1, aa: 0 });
    expect(CHARACTERS.shennau?.maxStress).toBe(2);
    expect(CHARACTERS.shennau?.affinities).toEqual([]);
    expect(SKILLS.shennauSettingManiac?.status).toBe('implemented');
    expect(SKILLS.shennauDoItMyself?.status).toBe('implemented');
  });

  it('trades exactly one selected Text die for one extra Design die once per round', () => {
    const game = createInitialGame(() => 0.8, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.8, DEFAULT_CONTENT);
    game.player.pendingDice = [{ id: 'text-1', ownerId: 'shennau', skill: 'text', value: 4, round: 1, origin: 'test' }];

    expect(engine.activateSkill('player', 'shennau', 'shennauSettingManiac', { targetDieId: 'text-1' })).toBe(true);
    expect(game.player.pendingDice.some((die) => die.id === 'text-1')).toBe(false);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'shennau' && die.skill === 'design')).toHaveLength(1);
    expect(engine.activateSkill('player', 'shennau', 'shennauSettingManiac', { targetDieId: game.player.pendingDice[0]?.id })).toBe(false);
  });

  it('rejects non-Text dice for 設定狂', () => {
    const game = createInitialGame(() => 0.8, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.8, DEFAULT_CONTENT);
    game.player.pendingDice = [{ id: 'design-1', ownerId: 'shennau', skill: 'design', value: 4, round: 1, origin: 'test' }];
    expect(engine.activateSkill('player', 'shennau', 'shennauSettingManiac', { targetDieId: 'design-1' })).toBe(false);
  });

  it('cancels external Stress changes but keeps normal self action Stress', () => {
    const game = createInitialGame(() => 0.8, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.8, DEFAULT_CONTENT);
    const member = game.player.members.find((item) => item.defId === 'shennau')!;

    engine.adjustStress('player', 'shennau', 2, '事件測試', true, 'pintbox');
    expect(member.stress).toBe(0);
    engine.adjustStress('player', 'shennau', 1, '工作');
    expect(member.stress).toBe(1);
  });

  it('cancels another character modifying 神惱 pending dice', () => {
    const game = createInitialGame(() => 0.8, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.8, DEFAULT_CONTENT);
    const event = engine.skills.emit({
      type: 'beforeDieModified', teamId: 'player', actorId: 'mashiro', targetId: 'shennau',
      dieId: 'die-x', skill: 'text', amount: 2,
    });
    expect(event.cancelled).toBe(true);
  });
});
