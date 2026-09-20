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

  it('work-time projected Stress can trigger 姆咪共鳴 exactly when the normal work fee will exceed the cap', () => {
    const { game, engine } = createCase(['mashiro', 'orangeangel', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    member.stress = 1;
    work.type = '情';

    engine.skills.emit({
      type: 'afterRollBatch',
      teamId: 'player',
      actorId: 'orangeangel',
      dice: [],
      amount: 0,
      sourceKind: 'work',
    });

    // 精神不穩先 +1，此時為 2；共鳴預看接下來一般工作 +1，最終 3 > cap 2。
    expect(member.stress).toBe(2);
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
