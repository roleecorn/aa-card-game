import { describe, expect, it } from 'vitest';
import { createInitialGame, EngineSession } from '../game/engine';
import { DEFAULT_CONTENT } from '../content/catalog';
import type { GameContent } from '../game/contentRegistry';
import { matchesCondition } from '../game/skillRuntime';
import type { EffectContext } from '../game/types';

function fixedRng(value: number) {
  return () => value;
}

function context(ownerId = 'pintbox'): EffectContext {
  return {
    ownerId,
    ownerTeamId: 'player',
    definition: { id: 'test-skill', name: 'Test Skill' },
    event: { type: 'activeSkill', teamId: 'player', actorId: ownerId },
  };
}

describe('data-driven skill runtime', () => {
  it('79 gets two Voice Meeting cards at game start', () => {
    const game = createInitialGame(fixedRng(0.5));
    const voiceCount = game.player.hand.filter((card) => card.cardId === 'voice').length;
    expect(voiceCount).toBeGreaterThanOrEqual(2);
  });

  it('Pintbox AI reduces the first external stress gain each round', () => {
    const game = createInitialGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.adjustStress('player', 'pintbox', 3, 'test-event', true, 'narrator');
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(2);
    engine.adjustStress('player', 'pintbox', 3, 'test-event', true, 'narrator');
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(5);
  });

  it('79 resonance reacts to another ally receiving extra Design dice', () => {
    const game = createInitialGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    const before = game.player.pendingDice.filter((die) => die.ownerId === 'user79').length;
    engine.grantDice('player', 'mashiro', 'design', 1, 'test-extra', true);
    const after = game.player.pendingDice.filter((die) => die.ownerId === 'user79' && die.skill === 'design').length;
    expect(after).toBe(before + 1);
  });

  it('Mashiro has all affinities and can copy another ally pending die value once per round', () => {
    const game = createInitialGame(fixedRng(0.1));
    const engine = new EngineSession(game, fixedRng(0.1));
    expect(engine.getEffectiveAffinity('mashiro')).toBe('all');

    const source = engine.grantDice('player', 'pintbox', 'design', 1, 'source', false, 6)[0];
    const target = engine.grantDice('player', 'mashiro', 'text', 1, 'target', false, 1)[0];
    expect(source && target).toBeTruthy();
    if (!source || !target) return;
    source.value = 6;
    target.value = 1;

    expect(engine.activateSkill('player', 'mashiro', 'mashiroSynthesis', { sourceDieId: source.id, targetDieId: target.id })).toBe(true);
    expect(target.value).toBe(6);
    expect(engine.activateSkill('player', 'mashiro', 'mashiroSynthesis', { sourceDieId: source.id, targetDieId: target.id })).toBe(false);
  });


  it('accepts an injected content pack without changing EngineSession code', () => {
    const customContent: GameContent = {
      ...DEFAULT_CONTENT,
      skills: {
        ...DEFAULT_CONTENT.skills,
        prototypeInjectedSkill: {
          id: 'prototypeInjectedSkill',
          name: '外掛技能',
          description: '測試用：壓力 -1 並獲得 1 顆 Text 骰。',
          activation: 'active',
          status: 'implemented',
          activeTarget: { kind: 'none' },
          activeEffects: [
            { kind: 'stress.change', target: 'owner', amount: -1, source: '外掛技能' },
            { kind: 'dice.grant', target: 'owner', skill: 'text', count: 1, origin: '外掛技能', extra: true },
          ],
        },
      },
      characters: {
        ...DEFAULT_CONTENT.characters,
        pintbox: {
          ...DEFAULT_CONTENT.characters.pintbox!,
          skillIds: [...DEFAULT_CONTENT.characters.pintbox!.skillIds, 'prototypeInjectedSkill'],
        },
      },
    };
    const game = createInitialGame(fixedRng(0.5), customContent);
    const engine = new EngineSession(game, fixedRng(0.5), customContent);
    engine.getCharacter('player', 'pintbox')!.stress = 2;

    expect(engine.activateSkill('player', 'pintbox', 'prototypeInjectedSkill')).toBe(true);
    expect(engine.getCharacter('player', 'pintbox')!.stress).toBe(1);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'pintbox' && die.skill === 'text')).toBe(true);
  });
  it('Bluewind active skill is composed from generic dice/work/stress effects', () => {
    const game = createInitialGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    const member = engine.getCharacter('enemy', 'bluewind')!;
    member.stress = 2;
    const work = game.enemy.works.find((item) => item.ownerId === 'bluewind')!;
    const beforeLength = work.length;
    expect(engine.activateSkill('enemy', 'bluewind', 'bluewindDelusion')).toBe(true);
    expect(work.length).toBe(beforeLength + 1);
    expect(member.stress).toBe(1);
    expect(game.enemy.pendingDice.filter((die) => die.ownerId === 'bluewind' && die.skill === 'design')).toHaveLength(2);
  });
});

describe('generic effect vocabulary', () => {
  it('can choose members by stress without character-specific code', () => {
    const game = createInitialGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.getCharacter('enemy', 'narrator')!.stress = 1;
    engine.getCharacter('enemy', 'ginsakura')!.stress = 2;
    engine.getCharacter('enemy', 'bluewind')!.stress = 0;

    expect(engine.applyEffects([
      { kind: 'stress.change', target: 'highestStressEnemy', amount: 1, source: 'test' },
    ], context())).toBe(true);
    expect(engine.getCharacter('enemy', 'ginsakura')!.stress).toBe(3);
  });

  it('supports selected-die modification, conversion, and filtered removal', () => {
    const game = createInitialGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    const dice = engine.grantDice('player', 'mashiro', 'design', 3, 'test', false);
    dice[0]!.value = 1;
    dice[1]!.value = 3;
    dice[2]!.value = 6;

    expect(engine.applyEffects([
      { kind: 'dice.modifySelected', add: 2 },
    ], { ...context('mashiro'), activationTarget: { targetDieId: dice[0]!.id } })).toBe(true);
    expect(dice[0]!.value).toBe(3);

    expect(engine.applyEffects([
      { kind: 'dice.convertPending', target: 'owner', fromSkill: 'design', toSkill: 'text', count: 1 },
    ], context('mashiro'))).toBe(true);
    expect(dice.filter((die) => die.skill === 'text')).toHaveLength(1);

    expect(engine.applyEffects([
      { kind: 'dice.removePending', target: 'owner', count: 1, order: 'highest' },
    ], context('mashiro'))).toBe(true);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'mashiro')).toHaveLength(2);
    expect(game.player.pendingDice.some((die) => die.id === dice[2]!.id)).toBe(false);
  });

  it('can clear existing progress generically', () => {
    const game = createInitialGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    const work = game.player.works[0]!;
    work.slots[0] = { design: 1, text: 4, aa: 5 };
    work.slots[1] = { design: 2 };

    expect(engine.applyEffects([
      { kind: 'work.progress.clear', target: 'selectedWork', count: 2, order: 'lowest' },
    ], { ...context(), activationTarget: { workId: work.id } })).toBe(true);
    expect(work.slots[0]!.design).toBeUndefined();
    expect(work.slots[1]!.design).toBeUndefined();
    expect(work.slots[0]!.text).toBe(4);
  });
});

describe('generic conditions', () => {
  it('supports round/stat/pending-dice/work/chance conditions', () => {
    const game = createInitialGame(fixedRng(0.2));
    const engine = new EngineSession(game, fixedRng(0.2));
    const ctx = context('pintbox');
    const die = engine.grantDice('player', 'pintbox', 'design', 1, 'condition-test', false)[0]!;
    die.value = 5;
    const work = game.player.works.find((item) => item.ownerId === 'pintbox')!;
    work.slots[0] = { design: 4, text: 4, aa: 4 };

    expect(matchesCondition({ kind: 'round', op: 'eq', value: 1 }, ctx, engine)).toBe(true);
    expect(matchesCondition({ kind: 'ownerStat', skill: 'design', op: 'gte', value: 2 }, ctx, engine)).toBe(true);
    expect(matchesCondition({ kind: 'pendingDice', target: 'owner', skill: 'design', minValue: 5, countAtLeast: 1 }, ctx, engine)).toBe(true);
    expect(matchesCondition({ kind: 'workType', target: 'ownerWork', types: ['謀'] }, ctx, engine)).toBe(true);
    expect(matchesCondition({ kind: 'workScore', target: 'ownerWork', op: 'gte', value: -4 }, ctx, engine)).toBe(true);
    expect(matchesCondition({ kind: 'chance', probability: 0.25 }, ctx, engine)).toBe(true);
  });
});
