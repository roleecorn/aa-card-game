import { describe, expect, it } from 'vitest';
import { GAMEPLAY_STATUS } from '../game/statuses';
import type { DieToken } from '../game/types';
import { createSkillHarness, SKILL_FIXTURES } from './helpers/skillHarness';

describe('audited character skill regressions', () => {
  it('Pintbox 審稿 rerolls every allied low pending die and charges each die owner', () => {
    const { game, engine } = createSkillHarness({ player: ['pintbox'] });
    const own = engine.grantDice('player', 'pintbox', 'design', 1, 'setup', false)[0]!;
    const ally = engine.grantDice('player', SKILL_FIXTURES.playerA, 'text', 1, 'setup', false)[0]!;
    own.value = 1;
    ally.value = 2;

    expect(engine.activateSkill('player', 'pintbox', 'pintboxReview', { targetDieId: ally.id })).toBe(true);
    expect(own.value).toBe(4);
    expect(ally.value).toBe(4);
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(1);
    expect(engine.getCharacter('player', SKILL_FIXTURES.playerA)?.stress).toBe(1);
    expect(game.player.pendingDice).toEqual(expect.arrayContaining([own, ally]));
  });

  it('Pintbox 基本要求 repeatedly reviews both the work batch and existing pending dice until they are at least 3', () => {
    const { game, engine } = createSkillHarness({ player: ['pintbox'] });
    engine.getCharacter('player', 'pintbox')!.stress = 3;
    const pending = engine.grantDice('player', SKILL_FIXTURES.playerB, 'design', 1, 'setup', false)[0]!;
    pending.value = 1;
    const batch: DieToken[] = [{
      id: 'batch-low',
      ownerId: SKILL_FIXTURES.playerA,
      skill: 'text',
      value: 2,
      round: game.round,
      origin: '工作',
    }];

    engine.skills.emit({
      type: 'afterRollBatch',
      teamId: 'player',
      actorId: SKILL_FIXTURES.playerA,
      dice: batch,
      amount: 1,
      sourceKind: 'work',
    });

    expect(pending.value).toBeGreaterThanOrEqual(3);
    expect(batch[0]!.value).toBeGreaterThanOrEqual(3);
    expect(engine.getCharacter('player', SKILL_FIXTURES.playerA)?.stress).toBe(1);
    expect(engine.getCharacter('player', SKILL_FIXTURES.playerB)?.stress).toBe(1);
  });

  it('風揚 起來 transfers one Stress to the leader at cap and cancels when 風揚 is the leader', () => {
    const memberCase = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'fengyang'] });
    memberCase.engine.getCharacter('player', 'fengyang')!.stress = 2;
    memberCase.engine.skills.emit({ type: 'roundStart' });
    expect(memberCase.engine.getCharacter('player', 'fengyang')?.stress).toBe(1);
    expect(memberCase.engine.getCharacter('player', SKILL_FIXTURES.playerA)?.stress).toBe(1);

    const leaderCase = createSkillHarness({ player: ['fengyang'] });
    leaderCase.engine.getCharacter('player', 'fengyang')!.stress = 2;
    leaderCase.engine.skills.emit({ type: 'roundStart' });
    expect(leaderCase.engine.getCharacter('player', 'fengyang')?.stress).toBe(2);
  });

  it('情緒 屬陀螺的 observes 指導 target while 指導 skips the normal coordination fee', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'emotion'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    leader.stress = 1;
    engine.addCard('player', 'guide', 2);
    const cards = game.player.hand.filter((card) => card.cardId === 'guide');

    expect(engine.playCard('player', cards[0]!.instanceId, { memberId: 'emotion', skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(0);
    expect(engine.playCard('player', cards[1]!.instanceId, { memberId: 'emotion', skill: 'text' })).toBe(true);
    expect(leader.stress).toBe(0);
  });

  it('阿道 開個回憶篇 receives slotIndex from real die placement', () => {
    const { engine } = createSkillHarness({ player: ['adao'] });
    const work = engine.getTeam('player').works.find((candidate) => candidate.ownerId === 'adao')!;
    const third = engine.grantDice('player', 'adao', 'design', 1, 'setup', false)[0]!;
    third.value = 4;
    expect(engine.placeDie('player', third.id, work.id, 2)).toBe(true);
    expect(engine.getCharacter('player', 'adao')?.stress).toBe(0);

    const fourth = engine.grantDice('player', 'adao', 'design', 1, 'setup', false)[0]!;
    fourth.value = 4;
    expect(engine.placeDie('player', fourth.id, work.id, 3)).toBe(true);
    expect(engine.getCharacter('player', 'adao')?.stress).toBe(1);
  });

  it('阿道 length changes share one two-use game quota and shortening is unavailable at length 1', () => {
    const { engine } = createSkillHarness({ player: ['adao'] });
    const work = engine.getTeam('player').works.find((candidate) => candidate.ownerId === 'adao')!;
    expect(engine.activateSkill('player', 'adao', 'adaoLengthen', { workId: work.id })).toBe(true);
    expect(engine.activateSkill('player', 'adao', 'adaoShorten', { workId: work.id })).toBe(true);
    expect(engine.activateSkill('player', 'adao', 'adaoLengthen', { workId: work.id })).toBe(false);
    expect(engine.canUseActiveSkill('adao', 'adaoShorten')).toBe(false);

    const minimum = createSkillHarness({ player: ['adao'] });
    const minWork = minimum.engine.getTeam('player').works.find((candidate) => candidate.ownerId === 'adao')!;
    minimum.engine.resizeWork(minWork, -99, 1);
    expect(minWork.length).toBe(1);
    expect(minimum.engine.canUseActiveSkill('adao', 'adaoShorten')).toBe(false);
  });

  it('Enki 代組長力 actually raises effective max Stress by 2 when the leader hides', () => {
    const { engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'enki'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    leader.statuses[GAMEPLAY_STATUS.hidden] = { stacks: 1 };

    engine.skills.emit({
      type: 'activeSkill',
      teamId: 'player',
      actorId: SKILL_FIXTURES.playerA,
      targetId: SKILL_FIXTURES.playerA,
      metadata: { hiddenEvent: true },
    });

    expect(engine.getEffectiveMaxStress('player', 'enki')).toBe(6);
  });

  it('Enki 副組長力 uses headroom for normal coordination cost but does not intercept 指導 target Stress', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'enki'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    const enki = engine.getCharacter('player', 'enki')!;
    const target = engine.getCharacter('player', SKILL_FIXTURES.playerB)!;
    leader.stress = 4;
    enki.stress = 2;

    engine.addCard('player', 'guide', 1);
    const guide = game.player.hand.find((card) => card.cardId === 'guide')!;
    expect(engine.playCard('player', guide.instanceId, { memberId: SKILL_FIXTURES.playerB, skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(4);
    expect(enki.stress).toBe(2);
    expect(target.stress).toBe(1);

    engine.addCard('player', 'soothe', 1);
    const soothe = game.player.hand.find((card) => card.cardId === 'soothe')!;
    expect(engine.playCard('player', soothe.instanceId, { memberId: SKILL_FIXTURES.playerB })).toBe(true);
    expect(leader.stress).toBe(4);
    expect(enki.stress).toBe(3);

    engine.addCard('enemy', 'guide', 1);
    const enemyCard = game.enemy.hand.find((card) => card.cardId === 'guide')!;
    expect(engine.playCard('enemy', enemyCard.instanceId, { memberId: SKILL_FIXTURES.enemyB, skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(4);
    expect(enki.stress).toBe(3);
  });

  it('multiple vice leaders choose exactly one normal coordination Stress bearer', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'meteor', 'enki'] });
    engine.getCharacter('player', SKILL_FIXTURES.playerA)!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: SKILL_FIXTURES.playerA })).toBe(true);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'enki')?.stress).toBe(0);
    expect(engine.getCharacter('player', SKILL_FIXTURES.playerA)?.stress).toBe(-1);
  });

  it('秋影 拖延症 removes low extra dice from both the event payload and pending state', () => {
    const { game, engine } = createSkillHarness({ player: ['akikage'], rng: () => 0 });
    const before = game.player.pendingDice.length;
    const granted = engine.grantDice('player', 'akikage', 'design', 1, 'extra-test', true);
    expect(granted).toHaveLength(0);
    expect(game.player.pendingDice).toHaveLength(before);
  });

  it('hidden/action-blocked characters cannot activate manual skills even with a legal target', () => {
    const { engine } = createSkillHarness({ player: ['pray'] });
    const die = engine.grantDice('player', 'pray', 'text', 1, 'setup', false)[0]!;
    die.value = 2;
    engine.getCharacter('player', 'pray')!.statuses[GAMEPLAY_STATUS.hidden] = { stacks: 1 };

    expect(engine.canUseActiveSkill('pray', 'prayProductive')).toBe(false);
    expect(engine.activateSkill('player', 'pray', 'prayProductive', { targetDieId: die.id })).toBe(false);
  });
});
