import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['grimm', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('格林 complete character package', () => {
  it('keeps calibrated values and production assets together', () => {
    expect(CHARACTERS.grimm?.stats).toEqual({ design: 1, text: 2, aa: 3 });
    expect(CHARACTERS.grimm?.maxStress).toBe(4);
    expect(CHARACTERS.grimm?.affinities).toEqual(['情', '燃', '笑']);
    expect(CHARACTERS.grimm?.tags).toEqual(expect.arrayContaining(['leader', 'visual-storyteller']));
    expect(CHARACTERS.grimm?.portrait).toBe('/assets/characters/portrait/grimm.webp');
    expect(CHARACTERS.grimm?.compactPortrait).toBe('/assets/characters/compact/grimm.webp');
    expect(SKILLS.grimmBurningFrame?.name).toBe('對托內利可的愛');
    expect(SKILLS.grimmBurningFrame?.status).toBe('implemented');
  });

  it('對托內利可的愛 sets one placed die to 3 and reduces Stress once per round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'grimm')!;
    const grimm = engine.getCharacter('player', 'grimm')!;
    work.type = '情';
    work.slots[0]!.aa = 5;
    grimm.stress = 2;

    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', {
      workId: work.id,
      targetDieId: '0:aa',
    })).toBe(true);
    expect(work.slots[0]!.aa).toBe(3);
    expect(grimm.stress).toBe(1);
    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', {
      workId: work.id,
      targetDieId: '0:aa',
    })).toBe(false);
  });
});
