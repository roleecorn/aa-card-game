import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION, WORK_TYPES } from '../content/catalog';
import { createInitialGame, EngineSession, getInitialWorkTypeChoices } from '../game/engine';
import { workTypeSchema } from '../game/schema';

const playerIds = ['user79', 'meteor', 'avocado'];
const enemyIds = ['pintbox', 'mashiro', 'happy'];

function create(rng: () => number = () => 0.99) {
  const state = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
    playerMemberIds: playerIds,
    enemyMemberIds: enemyIds,
  });
  return { state, engine: new EngineSession(state, rng, STANDARD_GAME_DEFINITION) };
}

describe('2026-09-19 discussion P0 rules', () => {
  it('removes 色 from the live work-type vocabulary', () => {
    expect(WORK_TYPES).toEqual(['燃', '謀', '笑', '情', '怪']);
    expect(workTypeSchema.safeParse('色').success).toBe(false);
  });

  it('supports explicit legal initial work-type choices', () => {
    expect(getInitialWorkTypeChoices('happy')).toContain('怪');
    const state = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['happy', 'user79', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'avocado'],
      playerWorkTypes: { happy: '怪', user79: '謀', meteor: '燃' },
    });
    expect(state.player.works.find((work) => work.ownerId === 'happy')?.type).toBe('怪');
    expect(() => createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['happy', 'user79', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'avocado'],
      playerWorkTypes: { happy: '燃' },
    })).toThrow(/cannot start with work type/);
  });

  it('treats extra work types as valid affinity matches', () => {
    const state = createInitialGame(() => 0.99, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['happy', 'user79', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'avocado'],
    });
    const engine = new EngineSession(state, () => 0.99, STANDARD_GAME_DEFINITION);
    const targetWork = state.player.works.find((work) => work.ownerId === 'user79')!;
    targetWork.type = '謀';
    targetWork.extraTypes = ['怪'];
    const die = engine.grantDice('player', 'happy', 'design', 1, 'test', false)[0]!;
    expect(engine.workHasType(targetWork, '謀')).toBe(true);
    expect(engine.workHasType(targetWork, '怪')).toBe(true);
    expect(engine.canPlaceDie('player', die, targetWork, 0)).toBe(true);
  });

  it('uses remaining stress headroom to choose a coordination bearer', () => {
    const { state, engine } = create();
    const leader = state.player.members.find((member) => member.defId === 'user79')!;
    const vice = state.player.members.find((member) => member.defId === 'meteor')!;

    leader.stress = 5; // effective max 6 => headroom 1
    vice.stress = 2; // max 4 => headroom 2
    expect(engine.skills.getCoordinationStressBearer('player', 1)).toBe('meteor');

    leader.stress = 4; // headroom 2
    vice.stress = 3; // headroom 1
    expect(engine.skills.getCoordinationStressBearer('player', 1)).toBe('user79');

    leader.stress = 6;
    vice.stress = 4;
    expect(engine.skills.getCoordinationStressBearer('player', 1)).toBeUndefined();
  });

  it('makes 指導 skip the normal coordination fee while charging the target', () => {
    const { state, engine } = create(() => 0.99);
    state.player.hand = [{ instanceId: 'guide-test', cardId: 'guide' }];
    const leader = state.player.members.find((member) => member.defId === 'user79')!;
    const target = state.player.members.find((member) => member.defId === 'avocado')!;
    expect(target.permanentStats.design).toBe(1);

    expect(engine.playCard('player', 'guide-test', { memberId: 'avocado', skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(0);
    expect(target.stress).toBe(1);
    expect(target.permanentStats.design).toBe(2);
  });

  it('removes a die when every face is forbidden instead of retrying forever', () => {
    const { state, engine } = create(() => 0);
    const member = state.player.members.find((item) => item.defId === 'avocado')!;
    (member.timedRollConstraints ??= []).push({ id: 'partial', forbiddenFaces: [1, 2, 5, 6], expiresAfterRound: 1 });
    expect(engine.rollDieFor('avocado')).toBe(3);
    member.timedRollConstraints!.push({ id: 'rest', forbiddenFaces: [3, 4], expiresAfterRound: 1 });
    expect(engine.rollDieFor('avocado')).toBeUndefined();
    expect(engine.grantDice('player', 'avocado', 'design', 1, 'blocked', true)).toEqual([]);
  });
});
