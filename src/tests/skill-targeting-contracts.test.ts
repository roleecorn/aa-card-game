import { describe, expect, it } from 'vitest';
import { getSkillAvailability, getSkillSelectionPlan } from '../game/targeting';
import { createSkillHarness, SKILL_FIXTURES } from './helpers/skillHarness';

function ownWork(engine: ReturnType<typeof createSkillHarness>['engine'], ownerId: string) {
  return engine.getTeam('player').works.find((work) => work.ownerId === ownerId)!;
}

describe('active skill availability contracts', () => {
  it('流星新版軌之共鳴是 passive，不建立 active target candidates', () => {
    const { engine } = createSkillHarness({ player: ['meteor'] });
    engine.grantDice('player', 'meteor', 'text', 1, 'setup', false);
    expect(getSkillAvailability(engine, 'meteor', 'meteorResonance').allowed).toBe(false);
    expect(getSkillSelectionPlan(engine, 'meteor', 'meteorResonance').candidates).toHaveLength(0);
  });

  it('格林 availability requires a 情 work with existing progress', () => {
    const { engine } = createSkillHarness({ player: ['grimm'] });
    const work = ownWork(engine, 'grimm');
    work.type = '燃';
    work.slots[0]!.design = 5;
    expect(getSkillAvailability(engine, 'grimm', 'grimmBurningFrame').allowed).toBe(false);

    work.type = '情';
    work.slots[0] = {};
    expect(getSkillAvailability(engine, 'grimm', 'grimmBurningFrame').allowed).toBe(false);

    work.slots[0]!.design = 5;
    expect(getSkillAvailability(engine, 'grimm', 'grimmBurningFrame').allowed).toBe(true);
    expect(getSkillSelectionPlan(engine, 'grimm', 'grimmBurningFrame').candidates
      .find((candidate) => candidate.id === work.id)?.allowed).toBe(true);
  });

  it('鬼影 cannot pay Stress for 貓影共鳴 when there is no Design progress to reroll', () => {
    const { engine } = createSkillHarness({ player: ['ghostshadow'] });
    const work = ownWork(engine, 'ghostshadow');
    expect(getSkillAvailability(engine, 'ghostshadow', 'ghostshadowCatResonance').allowed).toBe(false);

    work.slots[0]!.design = 3;
    expect(getSkillAvailability(engine, 'ghostshadow', 'ghostshadowCatResonance').allowed).toBe(true);
  });

  it('鴿子、嘆息、Pray exclude pending-die targets that would be no-ops', () => {
    const pigeon = createSkillHarness({ player: ['pigeon'] });
    const pigeonTarget = pigeon.engine.grantDice('player', SKILL_FIXTURES.playerA, 'design', 1, 'setup', false)[0]!;
    pigeonTarget.value = 6;
    expect(getSkillAvailability(pigeon.engine, 'pigeon', 'pigeonReaderPerspective').allowed).toBe(false);
    pigeonTarget.value = 5;
    expect(getSkillAvailability(pigeon.engine, 'pigeon', 'pigeonReaderPerspective').allowed).toBe(true);

    const tanxi = createSkillHarness({ player: ['tanxi'] });
    const tanxiDie = tanxi.engine.grantDice('player', 'tanxi', 'design', 1, 'setup', false)[0]!;
    tanxiDie.value = 6;
    expect(getSkillAvailability(tanxi.engine, 'tanxi', 'tanxiThinkHard').allowed).toBe(false);
    tanxiDie.value = 5;
    expect(getSkillAvailability(tanxi.engine, 'tanxi', 'tanxiThinkHard').allowed).toBe(true);

    const pray = createSkillHarness({ player: ['pray'] });
    const prayDie = pray.engine.grantDice('player', 'pray', 'design', 1, 'setup', false)[0]!;
    prayDie.value = 1;
    expect(getSkillAvailability(pray.engine, 'pray', 'prayProductive').allowed).toBe(false);
    prayDie.value = 2;
    expect(getSkillAvailability(pray.engine, 'pray', 'prayProductive').allowed).toBe(true);
  });

  it('TA is an untargeted action and is only available when it has pending dice', () => {
    const { engine } = createSkillHarness({ player: ['ta'] });
    expect(getSkillSelectionPlan(engine, 'ta', 'taPopularAuthor').stage).toBe('none');
    expect(getSkillAvailability(engine, 'ta', 'taPopularAuthor').allowed).toBe(false);

    engine.grantDice('player', 'ta', 'design', 1, 'setup', false);
    expect(getSkillAvailability(engine, 'ta', 'taPopularAuthor').allowed).toBe(true);
  });

  it('三角希 recovery requires at least one side of the selected pair to have Stress', () => {
    const { engine } = createSkillHarness({ player: ['triangle'], enemy: [SKILL_FIXTURES.triangle] });
    const targetId = SKILL_FIXTURES.triangle;
    const planAtZero = getSkillSelectionPlan(engine, 'triangle', 'triangleRecovery');
    expect(planAtZero.candidates.find((candidate) => candidate.id === targetId)?.allowed).toBe(false);
    expect(getSkillAvailability(engine, 'triangle', 'triangleRecovery').allowed).toBe(false);

    engine.getCharacter('enemy', targetId)!.stress = 1;
    const planWithStress = getSkillSelectionPlan(engine, 'triangle', 'triangleRecovery');
    expect(planWithStress.candidates.find((candidate) => candidate.id === targetId)?.allowed).toBe(true);
    expect(getSkillAvailability(engine, 'triangle', 'triangleRecovery').allowed).toBe(true);
  });

  it('every allowed pending-die candidate is accepted by the same runtime validator', () => {
    const { engine } = createSkillHarness({ player: ['user79'] });
    const design = engine.grantDice('player', 'user79', 'design', 1, 'setup', false)[0]!;
    const text = engine.grantDice('player', 'user79', 'text', 1, 'setup', false)[0]!;
    design.value = 4;
    text.value = 4;

    const plan = getSkillSelectionPlan(engine, 'user79', 'burningText79');
    for (const candidate of plan.candidates) {
      expect(candidate.allowed).toBe(
        engine.skills.canActivateSkillTarget('user79', 'burningText79', { targetDieId: candidate.id }),
      );
    }
    expect(plan.candidates.find((candidate) => candidate.id === design.id)?.allowed).toBe(false);
    expect(plan.candidates.find((candidate) => candidate.id === text.id)?.allowed).toBe(true);
  });
});
