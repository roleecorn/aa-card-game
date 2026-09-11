import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTENT,
  SKILLS,
  STANDARD_GAME_DEFINITION,
} from '../content/catalog';
import type { GameContent } from '../game/contentRegistry';
import {
  applyLeaderStressBonuses,
  createInitialGame,
  EngineSession,
} from '../game/engine';
import { withGameContent, type GameDefinition } from '../game/gameDefinition';
import { GAMEPLAY_STATUS, getStatusStacks } from '../game/statuses';

const PLAYER_ROSTER = {
  playerMemberIds: ['yamada', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function createGame(
  gameDefinition: GameDefinition = STANDARD_GAME_DEFINITION,
  roster = PLAYER_ROSTER,
) {
  const game = createInitialGame(() => 0.5, gameDefinition, roster);
  applyLeaderStressBonuses(game, gameDefinition);
  return game;
}

function forceYamadaLeaderToLeave(engine: EngineSession, teamId: 'player' | 'enemy' = 'player') {
  const maxStress = engine.getEffectiveMaxStress(teamId, 'yamada');
  if (maxStress === null || maxStress === undefined) throw new Error('Yamada must have a finite Stress cap.');
  engine.adjustStress(teamId, 'yamada', maxStress, 'succession-test', true);
}

function withLeaderCardAudit(ownerId: string): GameDefinition {
  const customContent: GameContent = {
    ...DEFAULT_CONTENT,
    skills: {
      ...DEFAULT_CONTENT.skills,
      leaderCardAudit: {
        id: 'leaderCardAudit',
        name: 'Leader card audit',
        description: 'Test-only: when this character is the card actor, reduce own Stress by 1.',
        activation: 'triggered',
        status: 'implemented',
        triggers: [{
          event: 'cardPlayed',
          condition: { kind: 'relation', field: 'actorId', relation: 'self' },
          effects: [{ kind: 'stress.change', target: 'owner', amount: -1, source: 'leader-card-audit' }],
        }],
      },
    },
    characters: {
      ...DEFAULT_CONTENT.characters,
      [ownerId]: {
        ...DEFAULT_CONTENT.characters[ownerId]!,
        skillIds: [...DEFAULT_CONTENT.characters[ownerId]!.skillIds, 'leaderCardAudit'],
      },
    },
  };
  return withGameContent(STANDARD_GAME_DEFINITION, customContent);
}

describe('leader succession', () => {
  it('chooses a random remaining member instead of always taking the first member', () => {
    const lowRollGame = createGame();
    const lowRollEngine = new EngineSession(lowRollGame, () => 0, STANDARD_GAME_DEFINITION);
    forceYamadaLeaderToLeave(lowRollEngine);
    expect(lowRollGame.player.leaderId).toBe('pintbox');

    const highRollGame = createGame();
    const highRollEngine = new EngineSession(highRollGame, () => 0.999, STANDARD_GAME_DEFINITION);
    forceYamadaLeaderToLeave(highRollEngine);
    expect(highRollGame.player.leaderId).toBe('mashiro');
  });

  it('transfers the leader Stress-cap bonus to the randomly selected successor', () => {
    const game = createGame();
    const engine = new EngineSession(game, () => 0.999, STANDARD_GAME_DEFINITION);

    forceYamadaLeaderToLeave(engine);

    const successor = engine.getCharacter('player', 'mashiro')!;
    expect(game.player.leaderId).toBe('mashiro');
    expect(getStatusStacks(successor, GAMEPLAY_STATUS.leaderStressCapBonus))
      .toBe(STANDARD_GAME_DEFINITION.rules.leaderStressBonus);
    expect(engine.getEffectiveMaxStress('player', 'mashiro'))
      .toBe(DEFAULT_CONTENT.characters.mashiro!.maxStress! + STANDARD_GAME_DEFINITION.rules.leaderStressBonus);
  });

  it('does not change leadership when a non-leader leaves', () => {
    const game = createGame();
    const engine = new EngineSession(game, () => 0.999, STANDARD_GAME_DEFINITION);
    const leader = engine.getCharacter('player', 'yamada')!;

    expect(engine.departCharacter('player', 'pintbox', 'test departure')).toBe(true);

    expect(game.player.leaderId).toBe('yamada');
    expect(game.player.members.some((member) => member.defId === 'pintbox')).toBe(false);
    expect(getStatusStacks(leader, GAMEPLAY_STATUS.leaderStressCapBonus))
      .toBe(STANDARD_GAME_DEFINITION.rules.leaderStressBonus);
  });

  it('immediately loses when the departing player leader has no remaining successor', () => {
    const game = createGame();
    game.player.members = game.player.members.filter((member) => member.defId === 'yamada');
    game.player.leaderId = 'yamada';
    game.player.pendingDice = [];
    const yamada = game.player.members[0]!;
    yamada.stress = engineCapMinusOne(game, 'player');
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);

    engine.performPlayerActions({ yamada: 'work' });

    expect(game.player.members).toHaveLength(0);
    expect(game.phase).toBe('finished');
    expect(game.winner).toBe('enemy');
  });

  it('immediately gives the player the win when the enemy leader has no remaining successor', () => {
    const roster = {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: ['yamada', 'narrator', 'ginsakura'],
    };
    const game = createGame(STANDARD_GAME_DEFINITION, roster);
    game.enemy.members = game.enemy.members.filter((member) => member.defId === 'yamada');
    game.enemy.leaderId = 'yamada';
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);

    forceYamadaLeaderToLeave(engine, 'enemy');

    expect(game.enemy.members).toHaveLength(0);
    expect(game.phase).toBe('finished');
    expect(game.winner).toBe('player');
  });

  it('does not skip the next teammate when a leader leaves during team actions', () => {
    const game = createGame();
    game.player.pendingDice = [];
    const yamada = game.player.members.find((member) => member.defId === 'yamada')!;
    yamada.stress = engineCapMinusOne(game, 'player');
    const engine = new EngineSession(game, () => 0.999, STANDARD_GAME_DEFINITION);

    engine.performPlayerActions({ yamada: 'work', pintbox: 'work', mashiro: 'work' });

    expect(game.player.members.some((member) => member.defId === 'yamada')).toBe(false);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'pintbox')).toBe(true);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'mashiro')).toBe(true);
  });

  it('keeps leader-only coordination restrictions when Weakzhi randomly succeeds the leader', () => {
    const roster = {
      playerMemberIds: ['yamada', 'weakzhi', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    };
    const game = createGame(STANDARD_GAME_DEFINITION, roster);
    const engine = new EngineSession(game, () => 0, STANDARD_GAME_DEFINITION);
    forceYamadaLeaderToLeave(engine);
    expect(game.player.leaderId).toBe('weakzhi');

    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;
    engine.getCharacter('player', 'mashiro')!.stress = 2;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(false);
  });
});

describe('card ownership', () => {
  it('emits cardPlayed with the current leader as actor after succession', () => {
    const definition = withLeaderCardAudit('mashiro');
    const game = createGame(definition);
    const engine = new EngineSession(game, () => 0.999, definition);
    forceYamadaLeaderToLeave(engine);
    expect(game.player.leaderId).toBe('mashiro');

    const mashiro = engine.getCharacter('player', 'mashiro')!;
    mashiro.stress = 1;
    engine.getCharacter('player', 'pintbox')!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'pintbox' })).toBe(true);
    expect(mashiro.stress).toBe(1);
  });

  it('keeps the leader as card actor when viceLeaderPower redirects coordination Stress', () => {
    const definition = withLeaderCardAudit('pintbox');
    const roster = {
      playerMemberIds: ['pintbox', 'meteor', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    };
    const game = createGame(definition, roster);
    const engine = new EngineSession(game, () => 0.5, definition);
    const leader = engine.getCharacter('player', 'pintbox')!;
    const viceLeader = engine.getCharacter('player', 'meteor')!;
    leader.stress = 2;
    viceLeader.stress = 0;
    engine.getCharacter('player', 'mashiro')!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(viceLeader.stress).toBe(1);
    expect(leader.stress).toBe(1);
    expect(game.player.leaderId).toBe('pintbox');
  });

  it('does not keep the obsolete Triangle coordination permission skill', () => {
    expect(SKILLS.triangleCoordination).toBeUndefined();
  });
});

function engineCapMinusOne(game: ReturnType<typeof createInitialGame>, teamId: 'player' | 'enemy'): number {
  const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
  const maxStress = engine.getEffectiveMaxStress(teamId, 'yamada');
  if (maxStress === null || maxStress === undefined) throw new Error('Yamada must have a finite Stress cap.');
  return maxStress - 1;
}
