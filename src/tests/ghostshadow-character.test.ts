import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { DieToken } from '../game/types';

const ROSTER = {
  playerMemberIds: ['ghostshadow', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('鬼影 complete character package', () => {
  it('uses the latest PintBox calibration', () => {
    expect(CHARACTERS.ghostshadow?.stats).toEqual({ design: 1, text: 2, aa: 1 });
    expect(CHARACTERS.ghostshadow?.maxStress).toBe(3);
    expect(CHARACTERS.ghostshadow?.affinities).toEqual(['笑']);
    expect(CHARACTERS.ghostshadow?.portrait).toBe('/assets/characters/portrait/ghostshadow.webp');
    expect(CHARACTERS.ghostshadow?.compactPortrait).toBe('/assets/characters/compact/ghostshadow.webp');
    expect(SKILLS.ghostshadowImmatureDesign?.status).toBe('implemented');
    expect(SKILLS.ghostshadowCatResonance?.status).toBe('implemented');
  });

  it('不成熟的設計 prevents Design and AA dice from remaining 5 or 6', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const dice: DieToken[] = [
      { id: 'd1', ownerId: 'ghostshadow', skill: 'design', value: 6, round: 1, origin: 'test' },
      { id: 'd2', ownerId: 'ghostshadow', skill: 'aa', value: 5, round: 1, origin: 'test' },
      { id: 'd3', ownerId: 'ghostshadow', skill: 'text', value: 6, round: 1, origin: 'test' },
    ];

    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'ghostshadow', dice, amount: dice.length, sourceKind: 'work' });

    expect(dice[0]?.value).toBeLessThanOrEqual(4);
    expect(dice[1]?.value).toBeLessThanOrEqual(4);
    expect(dice[2]?.value).toBe(6);
  });

  it('貓影共鳴 adds one stress and rerolls all placed Design dice without the 5/6 restriction', () => {
    const game = createInitialGame(() => 0.999, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.999, STANDARD_GAME_DEFINITION);
    const work = game.player.works.find((item) => item.ownerId === 'ghostshadow')!;
    work.slots[0]!.design = 2;
    work.slots[1]!.design = 3;

    expect(engine.activateSkill('player', 'ghostshadow', 'ghostshadowCatResonance')).toBe(true);
    expect(engine.getCharacter('player', 'ghostshadow')?.stress).toBe(1);
    expect(work.slots[0]!.design).toBe(6);
    expect(work.slots[1]!.design).toBe(6);
  });
});
