import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

function createCase(playerMemberIds: string[], rng: () => number = () => 0) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
    playerMemberIds,
    enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
  });
  return { game, engine: new EngineSession(game, rng, STANDARD_GAME_DEFINITION) };
}

describe('2026-09-19 P2E finalized boundaries', () => {
  it('姆咪共鳴 does not trigger merely by reaching the non-leader Stress cap, but triggers on first exceed', () => {
    const { game, engine } = createCase(['mashiro', 'orangeangel', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    work.type = '情';
    work.extraTypes = ['笑'];
    member.stress = 1;

    engine.adjustStress('player', 'orangeangel', 1, 'exact-cap', true, 'narrator');
    expect(member.stress).toBe(2);
    expect(work.type).toBe('情');
    expect(work.slots.every((slot) => slot.design === undefined && slot.text === undefined && slot.aa === undefined)).toBe(true);

    engine.adjustStress('player', 'orangeangel', 1, 'over-cap', true, 'narrator');
    expect(member.stress).toBe(3);
    expect(work.type).toBe('怪');
    expect(work.extraTypes).toEqual([]);
    expect(work.slots.every((slot) => slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined)).toBe(true);
  });

  it('姆咪共鳴 uses effective maxStress, including the leader bonus', () => {
    const { game, engine } = createCase(['orangeangel', 'mashiro', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    const cap = engine.getEffectiveMaxStress('player', 'orangeangel')!;
    expect(cap).toBe(4);
    member.stress = cap - 1;
    work.type = '情';

    engine.adjustStress('player', 'orangeangel', 1, 'leader-cap', true, 'narrator');
    expect(member.stress).toBe(cap);
    expect(work.type).toBe('情');

    engine.adjustStress('player', 'orangeangel', 1, 'leader-over-cap', true, 'narrator');
    expect(member.stress).toBe(cap + 1);
    expect(work.type).toBe('怪');
  });

  it('姆咪共鳴 waits until a real Work action pushes Stress over the cap', () => {
    const { game, engine } = createCase(['mashiro', 'orangeangel', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    member.stress = 1;
    work.type = '情';

    engine.performPlayerActions({ mashiro: 'slack', orangeangel: 'work', pintbox: 'slack' });

    // 精神不穩使 Stress 到 2；一般工作費用實際結算到 3 後才觸發共鳴。
    expect(member.stress).toBe(3);
    expect(work.type).toBe('怪');
    expect(work.slots.every((slot) => slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined)).toBe(true);
  });

  it('弱智 final-fill never enters pending dice and cannot be changed by Pintbox review', () => {
    const { game, engine } = createCase(['pintbox', 'weakzhi', 'mashiro']);
    game.round = game.maxRounds;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'weakzhi')!;
    work.slots.forEach((slot) => {
      delete slot.design;
      delete slot.text;
      delete slot.aa;
    });

    engine.skills.emit({ type: 'roundEnd' });
    const settled = JSON.parse(JSON.stringify(work.slots));
    expect(game.player.pendingDice.some((die) => die.ownerId === 'weakzhi')).toBe(false);
    expect(work.slots.every((slot) => slot.design === 1 && slot.text === 1 && slot.aa === 1)).toBe(true);

    const low = engine.grantDice('player', 'mashiro', 'design', 1, 'review-control', false, 1)[0]!;
    low.value = 1;
    expect(engine.activateSkill('player', 'pintbox', 'pintboxBasicRequirements')).toBe(true);
    expect(work.slots).toEqual(settled);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'weakzhi')).toBe(false);
  });
});
