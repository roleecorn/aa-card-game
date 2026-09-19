import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { getSkillSelectionPlan } from '../game/targeting';

function createCase(ids: string[], rng: () => number = () => 0.999) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
    playerMemberIds: ids,
    enemyMemberIds: ['pintbox', 'bluewind', 'lemon'],
  });
  return { game, engine: new EngineSession(game, rng, STANDARD_GAME_DEFINITION) };
}

describe('2026-09-19 P2C Narrator and Ginsakura', () => {
  it('旁白 uses the four final affinities and keeps the existing Stress cap', () => {
    expect(CHARACTERS.narrator?.stats).toEqual({ design: 1, text: 3, aa: 1 });
    expect(CHARACTERS.narrator?.maxStress).toBe(5);
    expect(CHARACTERS.narrator?.affinities).toEqual(['情', '燃', '笑', '怪']);
    expect(SKILLS.narratorLongForm?.status).toBe('implemented');
    expect(SKILLS.narratorOsaka?.status).toBe('implemented');
  });

  it('超長段子手 grants two Text dice, lengthens the owner work, and lowers Stress once per round', () => {
    const { game, engine } = createCase(['narrator', 'mashiro', 'user79']);
    const narrator = engine.getCharacter('player', 'narrator')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'narrator')!;
    const beforeLength = work.length;
    narrator.stress = 2;
    const beforeDice = game.player.pendingDice.length;

    expect(engine.activateSkill('player', 'narrator', 'narratorLongForm')).toBe(true);
    expect(game.player.pendingDice.slice(beforeDice)).toHaveLength(2);
    expect(game.player.pendingDice.slice(beforeDice).every((die) => die.ownerId === 'narrator' && die.skill === 'text')).toBe(true);
    expect(work.length).toBe(beforeLength + 1);
    expect(narrator.stress).toBe(1);
    expect(engine.activateSkill('player', 'narrator', 'narratorLongForm')).toBe(false);
  });

  it('大鱷魚的召喚 rolls one Design directly into an allied work and replaces all work types with 笑', () => {
    const { game, engine } = createCase(['narrator', 'mashiro', 'user79']);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    work.type = '怪';
    work.extraTypes = ['燃'];
    work.slots.forEach((slot) => { delete slot.design; });

    expect(engine.skills.canActivateSkillTarget('narrator', 'narratorOsaka', { workId: work.id })).toBe(true);
    expect(engine.activateSkill('player', 'narrator', 'narratorOsaka', { workId: work.id })).toBe(true);
    expect(work.slots[0]!.design).toBe(6);
    expect(work.type).toBe('笑');
    expect(work.extraTypes).toEqual([]);
    expect(engine.activateSkill('player', 'narrator', 'narratorOsaka', { workId: work.id })).toBe(false);
  });

  it('大鱷魚的召喚 does not expose a work whose Design column has no empty slot', () => {
    const { game, engine } = createCase(['narrator', 'mashiro', 'user79']);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    work.slots.forEach((slot) => { slot.design = 3; });
    expect(engine.skills.canActivateSkillTarget('narrator', 'narratorOsaka', { workId: work.id })).toBe(false);
  });

  it('銀櫻 起來 transfers one Stress to the leader when she starts the round at her effective cap', () => {
    const { engine } = createCase(['mashiro', 'ginsakura', 'user79']);
    const silver = engine.getCharacter('player', 'ginsakura')!;
    const leader = engine.getCharacter('player', 'mashiro')!;
    silver.stress = engine.getEffectiveMaxStress('player', 'ginsakura')!;
    leader.stress = 0;
    engine.skills.emit({ type: 'roundStart' });
    expect(silver.stress).toBe(2);
    expect(leader.stress).toBe(1);
  });

  it('愉悅的支援者 consumes a self die, copies its value to another ally, lowers Stress, and is once per round', () => {
    const { game, engine } = createCase(['mashiro', 'ginsakura', 'user79']);
    const silver = engine.getCharacter('player', 'ginsakura')!;
    silver.stress = 2;
    game.player.pendingDice = [];
    const source = engine.grantDice('player', 'ginsakura', 'aa', 1, 'setup', false, 5)[0]!;
    const target = engine.grantDice('player', 'mashiro', 'text', 1, 'setup', false, 2)[0]!;
    source.value = 5;
    target.value = 2;

    const sourcePlan = getSkillSelectionPlan(engine, 'ginsakura', 'ginsakuraSupport');
    expect(sourcePlan.stage).toBe('sourceDie');
    expect(sourcePlan.candidates.find((candidate) => candidate.id === source.id)?.allowed).toBe(true);
    expect(sourcePlan.candidates.find((candidate) => candidate.id === target.id)?.allowed).toBe(false);
    const targetPlan = getSkillSelectionPlan(engine, 'ginsakura', 'ginsakuraSupport', { sourceDieId: source.id });
    expect(targetPlan.candidates.find((candidate) => candidate.id === target.id)?.allowed).toBe(true);

    expect(engine.activateSkill('player', 'ginsakura', 'ginsakuraSupport', { sourceDieId: source.id, targetDieId: target.id })).toBe(true);
    expect(target.value).toBe(5);
    expect(game.player.pendingDice.some((die) => die.id === source.id)).toBe(false);
    expect(silver.stress).toBe(1);
    expect(engine.activateSkill('player', 'ginsakura', 'ginsakuraSupport', { sourceDieId: target.id, targetDieId: target.id })).toBe(false);
  });

  it('Mashiro keeps the original otherAlly -> self copy-die contract', () => {
    const { game, engine } = createCase(['mashiro', 'ginsakura', 'user79']);
    game.player.pendingDice = [];
    const source = engine.grantDice('player', 'ginsakura', 'text', 1, 'setup', false, 6)[0]!;
    const target = engine.grantDice('player', 'mashiro', 'aa', 1, 'setup', false, 1)[0]!;
    source.value = 6;
    target.value = 1;
    expect(engine.skills.canActivateSkillTarget('mashiro', 'mashiroSynthesis', { sourceDieId: source.id, targetDieId: target.id })).toBe(true);
    expect(engine.skills.canActivateSkillTarget('mashiro', 'mashiroSynthesis', { sourceDieId: target.id, targetDieId: source.id })).toBe(false);
  });
});
