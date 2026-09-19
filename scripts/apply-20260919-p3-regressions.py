from pathlib import Path

Path('src/tests/discussion-p3-regressions.test.ts').write_text(r'''import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { GAMEPLAY_STATUS } from '../game/statuses';
import { swapGamePerspective } from '../online/protocol';

function createCase(
  playerMemberIds: string[],
  enemyMemberIds = ['narrator', 'ginsakura', 'bluewind'],
  rng: () => number = () => 0.999,
) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, { playerMemberIds, enemyMemberIds });
  const engine = new EngineSession(game, rng, STANDARD_GAME_DEFINITION);
  return { game, engine };
}

function singleCard(engine: EngineSession, teamId: 'player' | 'enemy', cardId: string, instanceId: string) {
  engine.getTeam(teamId).hand = [{ instanceId, cardId }];
}

describe('2026-09-19 P3 cross-mechanic regressions', () => {
  it('blocks normal coordination with no legal pressure bearer, while Guide still targets Emotion and bypasses deputy pressure', () => {
    const { game, engine } = createCase(['user79', 'meteor', 'emotion']);
    game.player.leaderId = 'user79';
    const leader = engine.getCharacter('player', 'user79')!;
    const vice = engine.getCharacter('player', 'meteor')!;
    const emotion = engine.getCharacter('player', 'emotion')!;
    const leaderCap = engine.getEffectiveMaxStress('player', 'user79')!;
    const viceCap = engine.getEffectiveMaxStress('player', 'meteor')!;
    leader.stress = leaderCap;
    vice.stress = viceCap;
    emotion.stress = 0;

    singleCard(engine, 'player', 'oneOnOne', 'normal-coordination');
    expect(engine.playCard('player', 'normal-coordination', { memberId: 'emotion', skill: 'design' })).toBe(false);
    expect(leader.stress).toBe(leaderCap);
    expect(vice.stress).toBe(viceCap);

    singleCard(engine, 'player', 'guide', 'guide-special');
    expect(engine.playCard('player', 'guide-special', { memberId: 'emotion', skill: 'design' })).toBe(true);

    // Guide has no normal coordination fee, so the deputy does not absorb the target's +1 Stress.
    expect(emotion.stress).toBe(1);
    expect(vice.stress).toBe(viceCap);
    // Emotion still sees Guide as a coordination-card target and lowers the leader once.
    expect(leader.stress).toBe(leaderCap - 1);
    expect(emotion.permanentStats.design).toBe(2);
  });

  it('keeps a permanent Guide AA increase underneath temporary 技術故障 stat-zero', () => {
    const { game, engine } = createCase(
      ['avocado', 'mashiro', 'user79'],
      ['narrator', 'ginsakura', 'bluewind'],
    );
    const avocado = engine.getCharacter('player', 'avocado')!;
    expect(avocado.permanentStats.aa).toBe(0);

    singleCard(engine, 'enemy', 'techFailure', 'tech-failure');
    expect(engine.playCard('enemy', 'tech-failure', { memberId: 'avocado' })).toBe(true);
    expect(engine.getEffectiveStat('avocado', 'aa')).toBe(0);
    expect(avocado.statuses[GAMEPLAY_STATUS.aaStatZero]?.stacks).toBe(1);

    singleCard(engine, 'player', 'guide', 'guide-aa');
    expect(engine.playCard('player', 'guide-aa', { memberId: 'avocado', skill: 'aa' })).toBe(true);
    expect(avocado.permanentStats.aa).toBe(1);
    expect(engine.getEffectiveStat('avocado', 'aa')).toBe(0);

    delete avocado.statuses[GAMEPLAY_STATUS.aaStatZero];
    expect(engine.getEffectiveStat('avocado', 'aa')).toBe(1);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'avocado' && die.skill === 'aa')).toBe(true);
  });

  it('composes 靈感爆發 and 思維阻滯 into only 3/4, then returns no die when another constraint blocks 3/4', () => {
    const { game, engine } = createCase(['mashiro', 'user79', 'emotion'], undefined, () => 0);

    singleCard(engine, 'player', 'inspiration', 'inspiration');
    expect(engine.playCard('player', 'inspiration', {})).toBe(true);
    singleCard(engine, 'enemy', 'thoughtBlock', 'thought-block');
    expect(engine.playCard('enemy', 'thought-block', { memberId: 'mashiro' })).toBe(true);

    expect([...engine.skills.getForbiddenRollFaces('mashiro')].sort((a, b) => a - b)).toEqual([1, 2, 5, 6]);
    expect(engine.rollDieFor('mashiro')).toBe(3);

    const mashiro = engine.getCharacter('player', 'mashiro')!;
    (mashiro.timedRollConstraints ??= []).push({
      id: 'p3-block-remaining',
      forbiddenFaces: [3, 4],
      expiresAfterRound: game.round,
    });
    expect(engine.rollDieFor('mashiro')).toBeUndefined();
    expect(engine.grantDice('player', 'mashiro', 'design', 1, 'P3 no legal face', false)).toHaveLength(0);
  });

  it('distinguishes High add-type from Alligator replace-type and still lets the owner fill its now-unsupported own work', () => {
    const { game, engine } = createCase(['narrator', 'happy', 'avocado']);
    const avocadoWork = game.player.works.find((work) => work.ownerId === 'avocado')!;

    // High has already fired at game start: original type is retained and 怪 is additive.
    expect(avocadoWork.type).toBe('謀');
    expect(engine.getWorkTypes(avocadoWork)).toEqual(expect.arrayContaining(['謀', '怪']));

    expect(engine.activateSkill('player', 'narrator', 'narratorOsaka', { workId: avocadoWork.id })).toBe(true);
    expect(engine.getWorkTypes(avocadoWork)).toEqual(['笑']);
    expect(engine.getEffectiveAffinity('avocado')).toEqual(['謀']);

    const die = engine.grantDice('player', 'avocado', 'design', 1, 'owner-after-replace', false, 4)[0]!;
    const emptyDesignSlot = avocadoWork.slots.findIndex((slot) => slot.design === undefined);
    expect(emptyDesignSlot).toBeGreaterThanOrEqual(0);
    expect(engine.placeDie('player', die.id, avocadoWork.id, emptyDesignSlot)).toBe(true);
  });

  it('preserves additive work types, temporary stat-zero and roll constraints across online perspective snapshots', () => {
    const { game } = createCase(['mashiro', 'avocado', 'emotion']);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'avocado')!;
    const member = game.player.members.find((candidate) => candidate.defId === 'avocado')!;
    work.extraTypes = ['怪'];
    member.statuses[GAMEPLAY_STATUS.aaStatZero] = { stacks: 1, expiresAfterRound: game.round };
    member.timedRollConstraints = [{ id: 'online-p3', forbiddenFaces: [1, 6], expiresAfterRound: game.round }];

    const remote = swapGamePerspective(game);
    const remoteWork = remote.enemy.works.find((candidate) => candidate.ownerId === 'avocado')!;
    const remoteMember = remote.enemy.members.find((candidate) => candidate.defId === 'avocado')!;

    expect(remoteWork.type).toBe(work.type);
    expect(remoteWork.extraTypes).toEqual(['怪']);
    expect(remoteMember.statuses[GAMEPLAY_STATUS.aaStatZero]).toEqual(member.statuses[GAMEPLAY_STATUS.aaStatZero]);
    expect(remoteMember.timedRollConstraints).toEqual(member.timedRollConstraints);
  });
});
''', encoding='utf-8')

print('P3 cross-mechanic regression patch applied successfully.')
