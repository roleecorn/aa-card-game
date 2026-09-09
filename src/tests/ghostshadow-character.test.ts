import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['ghostshadow', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('鬼影 complete character package', () => {
  it('keeps PintBox Text/Stress values and explicit prototype fields', () => {
    expect(CHARACTERS.ghostshadow?.stats).toEqual({ design: 0, text: 2, aa: 1 });
    expect(CHARACTERS.ghostshadow?.maxStress).toBe(2);
    expect(CHARACTERS.ghostshadow?.affinities).toEqual(['笑']);
    expect(CHARACTERS.ghostshadow?.portrait).toBe('/assets/characters/portrait/ghostshadow.webp');
    expect(CHARACTERS.ghostshadow?.compactPortrait).toBe('/assets/characters/compact/ghostshadow.webp');
    expect(SKILLS.ghostLoosePunchlines?.status).toBe('implemented');
    expect(SKILLS.ghostHardToCoordinate?.status).toBe('implemented');
  });

  it('鬆散段子 expands the work and grants two extra Text dice once per round', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.5);
    const work = game.player.works.find((item) => item.ownerId === 'ghostshadow')!;
    const beforeLength = work.length;
    const beforeDice = game.player.pendingDice.filter((die) => die.ownerId === 'ghostshadow').length;

    expect(engine.activateSkill('player', 'ghostshadow', 'ghostLoosePunchlines')).toBe(true);
    expect(work.length).toBe(beforeLength + 1);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'ghostshadow')).toHaveLength(beforeDice + 2);
    expect(engine.activateSkill('player', 'ghostshadow', 'ghostLoosePunchlines')).toBe(false);
  });

  it('各寫各的 adds stress only on the first other-ally placement each round', () => {
    const game = createInitialGame(() => 0.5, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.5);
    engine.skills.emit({ type: 'afterDiePlaced', teamId: 'player', actorId: 'pintbox' });
    expect(engine.getCharacter('player', 'ghostshadow')?.stress).toBe(1);
    engine.skills.emit({ type: 'afterDiePlaced', teamId: 'player', actorId: 'mashiro' });
    expect(engine.getCharacter('player', 'ghostshadow')?.stress).toBe(1);
  });
});
