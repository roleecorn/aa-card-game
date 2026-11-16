import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['grimm', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('格林 complete character package', () => {
  it('keeps both independent Grimm skills and their stable identities', () => {
    expect(CHARACTERS.grimm?.stats).toEqual({ design: 1, text: 2, aa: 3 });
    expect(CHARACTERS.grimm?.maxStress).toBe(4);
    expect(CHARACTERS.grimm?.affinities).toEqual(['情', '燃', '笑']);
    expect(CHARACTERS.grimm?.skillIds).toEqual(['grimmBurningFrame', 'grimmLoveForTonelico']);
    expect(CHARACTERS.grimm?.tags).toEqual(expect.arrayContaining(['leader', 'visual-storyteller']));
    expect(CHARACTERS.grimm?.portrait).toBe('/assets/characters/portrait/grimm.webp');
    expect(CHARACTERS.grimm?.compactPortrait).toBe('/assets/characters/compact/grimm.webp');
    expect(SKILLS.grimmBurningFrame?.name).toBe('燃燒畫面');
    expect(SKILLS.grimmBurningFrame?.status).toBe('implemented');
    expect(SKILLS.grimmLoveForTonelico?.name).toBe('對托內利可的愛');
    expect(SKILLS.grimmLoveForTonelico?.status).toBe('implemented');
  });

  it('燃燒畫面 spends stress to add 2 to selected pending AA dice and is not once-per-round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const first = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false)[0]!;
    const second = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false)[0]!;
    first.value = 4;
    second.value = 3;

    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', { targetDieId: first.id })).toBe(true);
    expect(first.value).toBe(6);
    expect(engine.getCharacter('player', 'grimm')?.stress).toBe(1);

    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', { targetDieId: second.id })).toBe(true);
    expect(second.value).toBe(5);
    expect(engine.getCharacter('player', 'grimm')?.stress).toBe(2);
  });

  it('對托內利可的愛 sets one placed die to 3 and reduces Stress once per round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'grimm')!;
    const grimm = engine.getCharacter('player', 'grimm')!;
    work.type = '情';
    work.slots[0]!.aa = 5;
    grimm.stress = 2;

    expect(engine.activateSkill('player', 'grimm', 'grimmLoveForTonelico', {
      workId: work.id,
      targetDieId: '0:aa',
    })).toBe(true);
    expect(work.slots[0]!.aa).toBe(3);
    expect(grimm.stress).toBe(1);
    expect(engine.activateSkill('player', 'grimm', 'grimmLoveForTonelico', {
      workId: work.id,
      targetDieId: '0:aa',
    })).toBe(false);
  });
});
