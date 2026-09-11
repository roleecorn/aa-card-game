import { describe, expect, it } from 'vitest';
import { createInitialGame, EngineSession, selectStandardRosters } from '../game/engine';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { isStandardPlayableCharacterId } from '../content/match';
import type { GameContent } from '../game/contentRegistry';
import { withGameContent, type GameDefinition } from '../game/gameDefinition';
import { matchesCondition } from '../game/skillRuntime';
import type { EffectContext, GameState } from '../game/types';

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
  playerMemberIds: ['triangle', 'avocado', 'pintbox'],
  enemyMemberIds: ['yashiro', 'ginsakura', 'bluewind'],
};

const FENGYANG_ROSTER = {
  playerMemberIds: ['fengyang', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function createFixedGame(rng: () => number = fixedRng(0.5), gameDefinition: GameDefinition = STANDARD_GAME_DEFINITION) {
  return createInitialGame(rng, gameDefinition, FIXED_ROSTER);
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
  it('79 uses the calibrated resonance and Text-die boost skills', () => {
    expect(CHARACTERS.user79?.skillIds).toEqual(expect.arrayContaining(['resonance79', 'burningText79']));
    expect(CHARACTERS.user79?.skillIds).not.toContain('virtualCircle79');
    expect(SKILLS.burningText79?.status).toBe('implemented');
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

  it('accepts an explicitly derived game definition with an injected content pack', () => {
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
    const customDefinition = withGameContent(STANDARD_GAME_DEFINITION, customContent);
    const game = createFixedGame(fixedRng(0.5), customDefinition);
    const engine = new EngineSession(game, fixedRng(0.5), customDefinition);
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

describe('additional discussion-ranked character cards', () => {
  it('adds the six requested characters with current calibrated values', () => {
    expect(Object.keys(CHARACTERS)).toEqual(expect.arrayContaining([
      'lemon',
      'meteor',
      'emotion',
      'yashiro',
      'avocado',
      'kitsu',
    ]));

    expect(CHARACTERS.meteor?.stats).toEqual({ design: 0, text: 1, aa: 2 });
    expect(CHARACTERS.meteor?.maxStress).toBe(4);
    expect(SKILLS.meteorTrack?.status).toBe('implemented');

    expect(CHARACTERS.yashiro?.stats).toEqual({ design: 1, text: 1, aa: 3 });
    expect(CHARACTERS.yashiro?.maxStress).toBe(5);

    for (const id of ['lemon', 'avocado', 'kitsu'] as const) {
      expect(CHARACTERS[id]?.stats).toEqual({ design: 1, text: 1, aa: 1 });
      expect(CHARACTERS[id]?.maxStress).toBe(5);
    }
    expect(CHARACTERS.emotion?.stats).toEqual({ design: 1, text: 1, aa: 2 });
    expect(CHARACTERS.emotion?.maxStress).toBe(5);

    expect(CHARACTERS.lemon?.portrait).toBe('/assets/characters/portrait/lemon.webp');
    expect(CHARACTERS.kitsu?.portrait).toBe('/assets/characters/portrait/kitsu.webp');
  });

  it('八代 reduces the highest allied stress by one at round start', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['yashiro', 'lemon', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.getCharacter('player', 'yashiro')!.stress = 1;
    engine.getCharacter('player', 'lemon')!.stress = 4;
    engine.getCharacter('player', 'meteor')!.stress = 2;

    engine.skills.emit({ type: 'roundStart' });

    expect(engine.getCharacter('player', 'lemon')?.stress).toBe(3);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(2);
  });
});

describe('流星 complete character package', () => {
  const METEOR_ROSTER = {
    playerMemberIds: ['pintbox', 'meteor', 'mashiro'],
    enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
  };

  it('uses the discussion-backed stats and production portrait', () => {
    expect(CHARACTERS.meteor?.stats).toEqual({ design: 0, text: 1, aa: 2 });
    expect(CHARACTERS.meteor?.maxStress).toBe(4);
    expect(CHARACTERS.meteor?.portrait).toBe('/assets/characters/portrait/meteor.webp');
    expect(SKILLS.meteorTrack?.status).toBe('implemented');
    expect(CHARACTERS.meteor?.skillIds).toContain('viceLeaderPower');
  });

  it('軌 only works on a 燃 owner work and keeps the better of two rolls', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, METEOR_ROSTER);
    const rolls = [0, 0.999];
    const skillRng = () => rolls.shift() ?? 0.5;
    const engine = new EngineSession(game, skillRng);
    const work = game.player.works.find((item) => item.ownerId === 'meteor')!;
    work.type = '謀';
    expect(engine.activateSkill('player', 'meteor', 'meteorTrack')).toBe(false);

    work.type = '燃';
    expect(engine.activateSkill('player', 'meteor', 'meteorTrack')).toBe(true);
    const die = game.player.pendingDice.find((item) => item.ownerId === 'meteor' && item.origin === '軌');
    expect(die?.skill).toBe('text');
    expect(die?.value).toBe(6);
    expect(engine.activateSkill('player', 'meteor', 'meteorTrack')).toBe(false);
  });

  it('副組長力 makes 流星 take coordination-card stress when below the leader', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, METEOR_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.getCharacter('player', 'pintbox')!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(2);
  });
});

describe('八代 complete character package', () => {
  const YASHIRO_ROSTER = {
    playerMemberIds: ['yashiro', 'lemon', 'meteor'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  };

  it('uses the sourced stats and production portrait', () => {
    expect(CHARACTERS.yashiro?.stats).toEqual({ design: 1, text: 1, aa: 3 });
    expect(CHARACTERS.yashiro?.maxStress).toBe(5);
    expect(CHARACTERS.yashiro?.portrait).toBe('/assets/characters/portrait/yashiro.webp');
    expect(SKILLS.yashiroQuickLearner?.status).toBe('implemented');
    expect(SKILLS.yashiroDeepResearch?.status).toBe('implemented');
  });

  it('可愛又好學 reduces the highest allied stress at round start', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, YASHIRO_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.getCharacter('player', 'yashiro')!.stress = 1;
    engine.getCharacter('player', 'lemon')!.stress = 4;
    engine.getCharacter('player', 'meteor')!.stress = 2;
    engine.skills.emit({ type: 'roundStart' });
    expect(engine.getCharacter('player', 'lemon')?.stress).toBe(3);
  });

  it('查到比預期更深 grants one Text die with floor 3 once per round', () => {
    const game = createInitialGame(fixedRng(0), STANDARD_GAME_DEFINITION, YASHIRO_ROSTER);
    const engine = new EngineSession(game, fixedRng(0));
    expect(engine.activateSkill('player', 'yashiro', 'yashiroDeepResearch')).toBe(true);
    const die = game.player.pendingDice.find((item) => item.ownerId === 'yashiro' && item.origin === '查到比預期更深');
    expect(die?.skill).toBe('text');
    expect(die?.value).toBeGreaterThanOrEqual(3);
    expect(engine.activateSkill('player', 'yashiro', 'yashiroDeepResearch')).toBe(false);
  });
});

describe('檸檬 complete character package', () => {
  const LEMON_ROSTER = {
    playerMemberIds: ['lemon', 'yashiro', 'meteor'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  };

  it('uses the calibrated affinity and Fire Rescue skill', () => {
    expect(CHARACTERS.lemon?.stats).toEqual({ design: 1, text: 1, aa: 1 });
    expect(CHARACTERS.lemon?.maxStress).toBe(5);
    expect(CHARACTERS.lemon?.affinities).toEqual(['謀']);
    expect(CHARACTERS.lemon?.portrait).toBe('/assets/characters/portrait/lemon.webp');
    expect(CHARACTERS.lemon?.skillIds).toContain('lemonFireRescue');
    expect(SKILLS.lemonFireRescue?.status).toBe('implemented');
  });

  it('火場救援 adds one stress and grants three rescue dice once per round', () => {
    const game = createInitialGame(fixedRng(0.999), STANDARD_GAME_DEFINITION, LEMON_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.999));
    const before = game.player.pendingDice.length;

    expect(engine.activateSkill('player', 'lemon', 'lemonFireRescue')).toBe(true);
    const granted = game.player.pendingDice.slice(before);
    expect(granted).toHaveLength(3);
    expect(granted.map((die) => die.skill)).toEqual(['design', 'text', 'aa']);
    expect(engine.getCharacter('player', 'lemon')?.stress).toBe(1);
    expect(engine.activateSkill('player', 'lemon', 'lemonFireRescue')).toBe(false);
  });
});

describe('情緒 complete character package', () => {
  const EMOTION_ROSTER = {
    playerMemberIds: ['emotion', 'lemon', 'meteor'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  };

  it('uses the calibrated AA value and production portrait', () => {
    expect(CHARACTERS.emotion?.stats).toEqual({ design: 1, text: 1, aa: 2 });
    expect(CHARACTERS.emotion?.maxStress).toBe(5);
    expect(CHARACTERS.emotion?.portrait).toBe('/assets/characters/portrait/emotion.webp');
    expect(SKILLS.emotionCraftAwareness?.status).toBe('implemented');
  });

  it('改善效果的意識 improves one pending AA die by one once per round', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, EMOTION_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    const die = engine.grantDice('player', 'emotion', 'aa', 1, 'test', false, 4)[0]!;
    die.value = 4;

    expect(engine.activateSkill('player', 'emotion', 'emotionCraftAwareness')).toBe(true);
    expect(die.value).toBe(5);
    expect(engine.activateSkill('player', 'emotion', 'emotionCraftAwareness')).toBe(false);
  });
});

describe('酪梨 complete character package', () => {
  const AVOCADO_ROSTER = {
    playerMemberIds: ['avocado', 'emotion', 'lemon'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  };

  it('uses the prototype baseline and production assets', () => {
    expect(CHARACTERS.avocado?.stats).toEqual({ design: 1, text: 1, aa: 1 });
    expect(CHARACTERS.avocado?.maxStress).toBe(5);
    expect(CHARACTERS.avocado?.portrait).toBe('/assets/characters/portrait/avocado.webp');
    expect(CHARACTERS.avocado?.compactPortrait).toBe('/assets/characters/compact/avocado.webp');
    expect(SKILLS.avocadoManual?.status).toBe('implemented');
  });

  it('使用說明 adds one 指導 card at game start', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, AVOCADO_ROSTER);
    expect(game.player.hand).toHaveLength(3);
    expect(game.player.hand.some((item) => item.cardId === 'guide')).toBe(true);
  });
});

describe('キツ complete character package', () => {
  const KITSU_ROSTER = {
    playerMemberIds: ['kitsu', 'avocado', 'emotion'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  };

  it('uses the prototype baseline and production assets', () => {
    expect(CHARACTERS.kitsu?.stats).toEqual({ design: 1, text: 1, aa: 1 });
    expect(CHARACTERS.kitsu?.maxStress).toBe(5);
    expect(CHARACTERS.kitsu?.portrait).toBe('/assets/characters/portrait/kitsu.webp');
    expect(CHARACTERS.kitsu?.compactPortrait).toBe('/assets/characters/compact/kitsu.webp');
    expect(SKILLS.kitsuReplayThirty?.status).toBe('implemented');
  });

  it('重播三十次 rerolls the first self work die of 1 once per round', () => {
    const game = createInitialGame(fixedRng(0.999), STANDARD_GAME_DEFINITION, KITSU_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.999));

    const first = { id: 'kitsu-low-a', ownerId: 'kitsu', skill: 'text' as const, value: 1 as const, round: 1, origin: '工作' };
    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'kitsu', dice: [first], amount: 1, sourceKind: 'work' });
    expect(first.value).toBe(6);

    const second = { id: 'kitsu-low-b', ownerId: 'kitsu', skill: 'text' as const, value: 1 as const, round: 1, origin: '工作' };
    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: 'kitsu', dice: [second], amount: 1, sourceKind: 'work' });
    expect(second.value).toBe(1);
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
    expect(SKILLS.chaosVitality?.status).toBe('implemented');
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
      Object.values(CHARACTERS).filter((character) => isStandardPlayableCharacterId(character.id)).length - 6,
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
    expect(CHARACTERS.happy?.portrait).toBe('/assets/characters/portrait/happy.webp');
    expect(CHARACTERS.happy?.compactPortrait).toBe('/assets/characters/compact/happy.webp');
    expect(CHARACTERS.happy?.portraitPosition).toEqual({ x: 50, y: 12 });

    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, HAPPY_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.adjustStress('player', 'happy', 20, 'test');
    expect(engine.getCharacter('player', 'happy')?.stress).toBe(20);
  });

  it('gets three extra coordination cards at game start', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, HAPPY_ROSTER);
    expect(game.player.hand).toHaveLength(5);
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
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, HAPPY_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    const work = game.player.works.find((item) => item.ownerId === 'happy')!;
    work.type = '謀';

    const die = engine.grantDice('player', 'happy', 'design', 1, 'test', false, 4)[0]!;
    die.value = 4;
    expect(engine.placeDie('player', die.id, work.id, 0)).toBe(true);
    expect(work.type).toBe('怪');
  });
});

describe('三角希 complete character package', () => {
  it('keeps the discussion-backed stats and duo portrait', () => {
    expect(CHARACTERS.triangle?.name).toBe('三角希');
    expect(CHARACTERS.triangle?.stats).toEqual({ design: 1, text: 2, aa: 2 });
    expect(CHARACTERS.triangle?.maxStress).toBe(4);
    expect(CHARACTERS.triangle?.tags).toContain('duo-card');
    expect(CHARACTERS.triangle?.tags).toContain('triangle-creature');
    expect(CHARACTERS.triangle?.portrait).toBe('/assets/characters/portrait/triangle.webp');
    expect(CHARACTERS.triangle?.compactPortrait).toBe('/assets/characters/compact/triangle.webp');
    expect(CHARACTERS.triangle?.portraitPosition).toEqual({ x: 50, y: 12 });
    expect(CHARACTERS.triangle?.skillIds).toContain('viceLeaderPower');
  });

  it('滾滾三角生物 targets another triangle creature on either team once per round', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, TRIANGLE_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    const triangle = engine.getCharacter('player', 'triangle')!;
    const avocado = engine.getCharacter('player', 'avocado')!;
    const yashiro = engine.getCharacter('enemy', 'yashiro')!;
    triangle.stress = 3;
    avocado.stress = 2;
    yashiro.stress = 2;

    expect(engine.activateSkill('player', 'triangle', 'triangleRecovery', { memberId: 'triangle' })).toBe(false);
    expect(engine.activateSkill('player', 'triangle', 'triangleRecovery', { memberId: 'yashiro' })).toBe(true);
    expect(triangle.stress).toBe(2);
    expect(yashiro.stress).toBe(1);
    expect(avocado.stress).toBe(2);
    expect(engine.activateSkill('player', 'triangle', 'triangleRecovery', { memberId: 'avocado' })).toBe(false);
    expect(engine.getEffectiveAffinity('triangle')).toBe('all');
  });

  it('keeps the old coordination permission definition explicit for compatibility', () => {
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
    expect(CHARACTERS.fengyang?.portrait).toBe('/assets/characters/portrait/fengyang.webp');
    expect(CHARACTERS.fengyang?.compactPortrait).toBe('/assets/characters/compact/fengyang.webp');
    expect(CHARACTERS.fengyang?.portraitPosition).toEqual({ x: 50, y: 12 });
  });

  it('commercial author makes every roll at least 3', () => {
    const game = createInitialGame(fixedRng(0), STANDARD_GAME_DEFINITION, FENGYANG_ROSTER);
    const engine = new EngineSession(game, fixedRng(0));

    expect(engine.skills.getRollFloor('fengyang')).toBe(3);
    expect(engine.rollDieFor('fengyang')).toBe(3);

    const dice = engine.grantDice('player', 'fengyang', 'design', 5, 'test', false);
    expect(dice.every((die) => die.value >= 3)).toBe(true);
  });
});

describe('卡奧斯 complete character package', () => {
  function createChaosGame(rng: () => number = fixedRng(0.5)): { game: GameState; engine: EngineSession } {
    const definition = CHARACTERS.chaos!;
    const resource = definition.resource;
    const game: GameState = {
      round: 1,
      maxRounds: 5,
      phase: 'player-plan',
      player: {
        id: 'player',
        name: 'player',
        leaderId: 'chaos',
        members: [{
          defId: 'chaos',
          stress: 0,
          permanentStats: { ...definition.stats },
          timedStatModifiers: [],
          skillUsage: {},
          statuses: {},
          resources: resource ? { [resource.name]: resource.initial } : undefined,
        }],
        works: [],
        hand: [],
        deck: [],
        discard: [],
        pendingDice: [],
      },
      enemy: {
        id: 'enemy',
        name: 'enemy',
        leaderId: '',
        members: [],
        works: [],
        hand: [],
        deck: [],
        discard: [],
        pendingDice: [],
      },
      logs: [],
    };
    const engine = new EngineSession(game, rng, STANDARD_GAME_DEFINITION);
    engine.start();
    return { game, engine };
  }

  it('keeps the Boss stats, portrait, resource and standard-match exclusion', () => {
    expect(CHARACTERS.chaos?.stats).toEqual({ design: 3, text: 3, aa: 3 });
    expect(CHARACTERS.chaos?.portrait).toBe('/assets/characters/portrait/chaos.webp');
    expect(CHARACTERS.chaos?.compactPortrait).toBe('/assets/characters/compact/chaos.webp');
    expect(CHARACTERS.chaos?.portraitPosition).toEqual({ x: 50, y: 12 });
    expect(CHARACTERS.chaos?.resource).toEqual({ name: '體力', max: 5, initial: 5 });
    expect(CHARACTERS.chaos?.tags).toEqual(['boss']);
    expect(CHARACTERS.chaos?.skillIds).toContain('chaosStressImmunity');
    expect(SKILLS.chaosStressImmunity?.status).toBe('implemented');
    expect(isStandardPlayableCharacterId('chaos')).toBe(false);
  });

  it('starts with 5 vitality, loses one at round end, and ignores stress', () => {
    const { engine } = createChaosGame(fixedRng(0.5));

    expect(engine.getResource('player', 'chaos', '體力')).toBe(5);
    engine.adjustStress('player', 'chaos', 99, 'test');
    expect(engine.getCharacter('player', 'chaos')?.stress).toBe(0);

    engine.skills.emit({ type: 'roundEnd' });
    expect(engine.getResource('player', 'chaos', '體力')).toBe(4);
  });

  it('never rolls below 3', () => {
    const { engine } = createChaosGame(fixedRng(0));

    expect(engine.skills.getRollFloor('chaos')).toBe(3);
    expect(engine.rollDieFor('chaos')).toBe(3);
  });
});