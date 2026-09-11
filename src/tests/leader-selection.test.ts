import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTERS } from '../content/catalog';
import { EngineSession } from '../game/engine';
import { GAMEPLAY_STATUS, getStatusStacks } from '../game/statuses';
import { useGameStore } from '../store/gameStore';

const PLAYER = ['pintbox', 'mashiro', 'user79'];
const ENEMY = ['narrator', 'ginsakura', 'bluewind'];

describe('pre-game leader selection', () => {
  afterEach(() => {
    useGameStore.getState().reset();
  });

  it('stores leader stress bonuses in match state without mutating character definitions', () => {
    const pintboxBase = CHARACTERS.pintbox!.maxStress;
    const mashiroBase = CHARACTERS.mashiro!.maxStress;
    const narratorBase = CHARACTERS.narrator!.maxStress;

    useGameStore.getState().startGame(PLAYER, ENEMY, 'mashiro');

    const game = useGameStore.getState().game!;
    const engine = new EngineSession(game);
    const mashiro = game.player.members.find((member) => member.defId === 'mashiro')!;
    const pintbox = game.player.members.find((member) => member.defId === 'pintbox')!;
    const narrator = game.enemy.members.find((member) => member.defId === 'narrator')!;

    expect(game.player.leaderId).toBe('mashiro');
    expect(game.player.members[0]?.defId).toBe('mashiro');
    expect(game.enemy.leaderId).toBe('narrator');
    expect(getStatusStacks(mashiro, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(2);
    expect(getStatusStacks(narrator, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(2);
    expect(getStatusStacks(pintbox, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(0);
    expect(engine.getEffectiveMaxStress('player', 'mashiro')).toBe((mashiroBase ?? 0) + 2);
    expect(engine.getEffectiveMaxStress('enemy', 'narrator')).toBe((narratorBase ?? 0) + 2);
    expect(CHARACTERS.mashiro?.maxStress).toBe(mashiroBase);
    expect(CHARACTERS.narrator?.maxStress).toBe(narratorBase);
    expect(CHARACTERS.pintbox?.maxStress).toBe(pintboxBase);
  });

  it('does not leak leader bonuses between matches', () => {
    const mashiroBase = CHARACTERS.mashiro!.maxStress;
    const pintboxBase = CHARACTERS.pintbox!.maxStress;

    useGameStore.getState().startGame(PLAYER, ENEMY, 'mashiro');
    useGameStore.getState().startGame(PLAYER, ENEMY, 'pintbox');

    const game = useGameStore.getState().game!;
    const engine = new EngineSession(game);
    const mashiro = game.player.members.find((member) => member.defId === 'mashiro')!;
    const pintbox = game.player.members.find((member) => member.defId === 'pintbox')!;

    expect(game.player.leaderId).toBe('pintbox');
    expect(getStatusStacks(pintbox, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(2);
    expect(getStatusStacks(mashiro, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(0);
    expect(engine.getEffectiveMaxStress('player', 'pintbox')).toBe((pintboxBase ?? 0) + 2);
    expect(engine.getEffectiveMaxStress('player', 'mashiro')).toBe(mashiroBase);
    expect(CHARACTERS.pintbox?.maxStress).toBe(pintboxBase);
    expect(CHARACTERS.mashiro?.maxStress).toBe(mashiroBase);
  });
});
