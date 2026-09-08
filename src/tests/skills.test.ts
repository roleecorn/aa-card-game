import { describe, expect, it } from 'vitest';
import { createInitialGame, EngineSession, selectStandardRosters } from '../game/engine';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import type { GameContent } from '../game/contentRegistry';
import { matchesCondition } from '../game/skillRuntime';
import type { EffectContext } from '../game/types';

function fixedRng(value: number) {
  return () => value;
}

const FIXED_ROSTER = {
  playerMemberIds: ['pintbox', 'mashiro', 'user79'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

const HAPPY_ROSTER = {
  playerMemberIds: ['happy', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

const TRIANGLE_ROSTER = {
  playerMemberIds: ['triangle', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

const FENGYANG_ROSTER = {
  playerMemberIds: ['fengyang', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function createFixedGame(rng: () => number = fixedRng(0.5), content: GameContent = DEFAULT_CONTENT) {
  return createInitialGame(rng, content, FIXED_ROSTER);
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
    const game = createFixedGame(fixedRng(0.5));
    const voiceCount = game.player.hand.filter((card) => card.cardId === 'voice').length;
    expect(voiceCount).toBeGreaterThanOrEqual(2);
  });

  it('Pintbox AI reduces the first external stress gain each round', () => {
    const game = createFixedGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.adjustStress('player', 'pintbox', 3, 'test-event', true, 'narrator');
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(2);
    engine.adjustStress('player', 'pintbox', 3, 'test-event', true, 'narrator');
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(5);
  });

  it('79 resonance reacts to another ally receiving extra Design dice', () => {
    const game = createFixedGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    const before = game.player.pendingDice.filter((die) => die.ownerId === 'user79').length;
    engine.grantDice('player', 'mashiro', 'design', 1, 'test-extra', true);
    const after = game.player.pendingDice.filter((die) => die.ownerId === 'user79' && die.skill === 'design').length;
    expect(after).toBe(before + 1);
  });

  it('Mashiro has all affinities and can copy another ally pending die value once per round', () => {
    const game = createFixedGame(fixedRng(0.1));
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
    const game = createFixedGame(fixedRng(0.5), customContent);
    const engine = new EngineSession(game, fixedRng(0.5), customContent);
    engine.getCharacter('player', 'pintbox')!.stress = 2;

    expect(engine.activateSkill('player', 'pintbox', 'prototypeInjectedSkill')).toBe(true);
    expect(engine.getCharacter('player', 'pintbox')!.stress).toBe(1);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'pintbox' && die.skill === 'text')).toBe(true);
  });
  it('Bluewind active skill is composed from generic dice/work/stress effects', () => {
    const game = createFixedGame(fixedRng(0.5));
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
    const game = createFixedGame(fixedRng(0.5));
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
    const game = createFixedGame(fixedRng(0.5));
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
    const game = createFixedGame(fixedRng(0.5));
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
    const game = createFixedGame(fixedRng(0.2));
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


describe('discussion-backed character catalog', () => {
  it('includes every character card with explicit values in the discussion notes', () => {
    expect(Object.keys(CHARACTERS)).toEqual(expect.arrayContaining([
      'pintbox',
      'user79',
      'mashiro',
      'ginsakura',
      'narrator',
      'bluewind',
      'triangle',
      'fengyang',
      'happy',
      'chaos',
    ]));

    expect(CHARACTERS.chaos?.stats).toEqual({ design: 3, text: 3, aa: 3 });
    expect(CHARACTERS.chaos?.maxStress).toBeNull();
    expect(CHARACTERS.chaos?.resource).toEqual({ name: '體力', max: 5, initial: 5 });
  });

  it('interprets "不會擲出 3 以下" as a roll floor of 3', () => {
    const game = createFixedGame(fixedRng(0));
    const engine = new EngineSession(game, fixedRng(0));

    expect(engine.skills.getRollFloor('fengyang')).toBe(3);
    expect(engine.skills.getRollFloor('chaos')).toBe(3);
    expect(SKILLS.commercialAuthor?.description).toContain('3 以下');
  });

  it('keeps discussion-defined but unsupported mechanics explicit instead of inventing behavior', () => {
    expect(SKILLS.triangleCoordination?.status).toBe('planned');
    expect(SKILLS.chaosVitality?.status).toBe('planned');
    expect(SKILLS.ginsakuraSupport?.description).toContain('目前整理紀錄沒有完整');
  });
});


describe('random standard roster selection', () => {
  it('draws three player characters, then three opponents from the remaining pool', () => {
    let seed = 123456789;
    const rng = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    const selected = selectStandardRosters(rng);
    expect(selected.playerMemberIds).toHaveLength(3);
    expect(selected.enemyMemberIds).toHaveLength(3);

    const fielded = [...selected.playerMemberIds, ...selected.enemyMemberIds];
    expect(new Set(fielded).size).toBe(6);
    expect(selected.enemyMemberIds.every((id) => !selected.playerMemberIds.includes(id))).toBe(true);
    expect(fielded).not.toContain('chaos');
    expect(selected.unusedMemberIds).toHaveLength(
      Object.values(CHARACTERS).filter((character) => !character.tags?.includes('not-standard-playable')).length - 6,
    );
  });

  it('creates a standard game with disjoint random rosters', () => {
    let seed = 987654321;
    const rng = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    const game = createInitialGame(rng);
    const playerIds = game.player.members.map((member) => member.defId);
    const enemyIds = game.enemy.members.map((member) => member.defId);

    expect(playerIds).toHaveLength(3);
    expect(enemyIds).toHaveLength(3);
    expect(new Set([...playerIds, ...enemyIds]).size).toBe(6);
    expect(enemyIds.every((id) => !playerIds.includes(id))).toBe(true);
    expect([...playerIds, ...enemyIds]).not.toContain('chaos');
  });

  it('rerolls each owned work type from that character affinity when available', () => {
    const game = createFixedGame(fixedRng(0.25));
    for (const team of [game.player, game.enemy]) {
      for (const work of team.works) {
        const character = CHARACTERS[work.ownerId]!;
        if (character.id === 'mashiro') continue;
        if (character.affinities.length) expect(character.affinities).toContain(work.type);
      }
    }
  });
});


describe('高興 complete character package', () => {
  it('uses the discussion-backed stats and unlimited stress', () => {
    expect(CHARACTERS.happy?.stats).toEqual({ design: 3, text: 0, aa: 0 });
    expect(CHARACTERS.happy?.maxStress).toBeNull();
    expect(CHARACTERS.happy?.portrait).toBe('/assets/characters/happy.webp');

    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, HAPPY_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.adjustStress('player', 'happy', 20, 'test');
    expect(engine.getCharacter('player', 'happy')?.stress).toBe(20);
  });

  it('gets three extra coordination cards at game start', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, HAPPY_ROSTER);
    expect(game.player.hand).toHaveLength(7);
    expect(game.logs.some((entry) => entry.text.includes('編輯長：額外取得 3 張統籌卡'))).toBe(true);
  });

  it('the generic random-card effect only adds cards of the requested kind', () => {
    const game = createFixedGame(fixedRng(0.5));
    const engine = new EngineSession(game, fixedRng(0.5));
    const before = game.player.hand.length;

    expect(engine.applyEffects([
      { kind: 'custom', handler: 'addRandomCardsByKind', args: { cardKind: 'coordination', count: 3 } },
    ], context())).toBe(true);

    const added = game.player.hand.slice(before);
    expect(added).toHaveLength(3);
    expect(added.every((instance) => DEFAULT_CONTENT.cards[instance.cardId]?.kind === 'coordination')).toBe(true);
  });

  it('turns a work into 怪 when 高興 places a die into it', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, HAPPY_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    const work = game.player.works.find((item) => item.ownerId === 'happy')!;
    work.type = '謀';

    const die = engine.grantDice('player', 'happy', 'design', 1, 'test', false, 4)[0]!;
    die.value = 4;
    expect(engine.placeDie('player', die.id, work.id, 0)).toBe(true);
    expect(work.type).toBe('怪');
  });
});


describe('三角希＆有希 complete character package', () => {
  it('keeps the discussion-backed stats and duo portrait', () => {
    expect(CHARACTERS.triangle?.name).toBe('三角希＆有希');
    expect(CHARACTERS.triangle?.stats).toEqual({ design: 1, text: 2, aa: 2 });
    expect(CHARACTERS.triangle?.maxStress).toBe(4);
    expect(CHARACTERS.triangle?.tags).toContain('duo-card');
    expect(CHARACTERS.triangle?.portrait).toBe('/assets/characters/triangle.webp');
  });

  it('recovers one stress at round start and has all work affinities', () => {
    const game = createInitialGame(fixedRng(0.5), DEFAULT_CONTENT, TRIANGLE_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    const member = engine.getCharacter('player', 'triangle')!;
    member.stress = 2;

    engine.skills.emit({ type: 'roundStart' });

    expect(member.stress).toBe(1);
    expect(engine.getEffectiveAffinity('triangle')).toBe('all');
  });

  it('keeps coordination permission explicit until card actor identity exists', () => {
    expect(SKILLS.triangleCoordination?.status).toBe('planned');
    expect(SKILLS.triangleCoordination?.passives).toEqual([
      { kind: 'card.permission', cardKind: 'coordination' },
    ]);
  });
});


describe('風揚 complete character package', () => {
  it('keeps the discussion-backed stats and portrait', () => {
    expect(CHARACTERS.fengyang?.stats).toEqual({ design: 3, text: 3, aa: 0 });
    expect(CHARACTERS.fengyang?.maxStress).toBe(2);
    expect(CHARACTERS.fengyang?.tags).toContain('commercial-author');
    expect(CHARACTERS.fengyang?.portrait).toBe('/assets/characters/fengyang.webp');
  });

  it('commercial author makes every roll at least 3', () => {
    const game = createInitialGame(fixedRng(0), DEFAULT_CONTENT, FENGYANG_ROSTER);
    const engine = new EngineSession(game, fixedRng(0));

    expect(engine.skills.getRollFloor('fengyang')).toBe(3);
    expect(engine.rollDieFor('fengyang')).toBe(3);

    const dice = engine.grantDice('player', 'fengyang', 'design', 5, 'test', false);
    expect(dice.every((die) => die.value >= 3)).toBe(true);
  });
});
