import { afterEach, describe, expect, it } from 'vitest';
import { CARDS, CHARACTERS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { chooseEnemyActions } from '../game/ai';
import { EngineSession, applyLeaderStressBonuses, createInitialGame } from '../game/engine';
import { GAMEPLAY_STATUS, getStatusStacks } from '../game/statuses';
import { useGameStore } from '../store/gameStore';
import { TUTORIAL_ENEMY_DECK } from '../tutorial/config';

const STANDARD_PLAYER = ['pintbox', 'mashiro', 'user79'];
const STANDARD_ENEMY = ['narrator', 'ginsakura', 'bluewind'];

function fixedRng(value: number) {
  return () => value;
}

describe('refactor regression coverage', () => {
  afterEach(() => {
    useGameStore.getState().reset();
  });

  it('enemy AI uses the effective leader Stress cap instead of the base character cap', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: STANDARD_PLAYER,
      enemyMemberIds: STANDARD_ENEMY,
    });
    applyLeaderStressBonuses(game, STANDARD_GAME_DEFINITION);
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);
    const leader = game.enemy.members.find((member) => member.defId === game.enemy.leaderId)!;
    const baseCap = CHARACTERS[leader.defId]!.maxStress;

    expect(baseCap).not.toBeNull();
    expect(engine.getEffectiveMaxStress('enemy', leader.defId)).toBe((baseCap ?? 0) + 2);

    leader.stress = baseCap!;

    expect(chooseEnemyActions(engine)[leader.defId]).toBe('work');
  });

  it('Yamada leader does not vanish before reaching the effective leader Stress cap', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['yamada', 'pintbox', 'mashiro'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    applyLeaderStressBonuses(game, STANDARD_GAME_DEFINITION);
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);

    expect(game.player.leaderId).toBe('yamada');
    expect(engine.getEffectiveMaxStress('player', 'yamada')).toBe(4);

    engine.adjustStress('player', 'yamada', 2, 'regression-test', true, 'narrator');

    expect(game.player.members.some((member) => member.defId === 'yamada')).toBe(true);
    expect(game.player.members.find((member) => member.defId === 'yamada')?.stress).toBe(2);
  });

  it('Tutorial applies the same leader Stress bonus as a normal match', () => {
    useGameStore.getState().startTutorial();
    const game = useGameStore.getState().game!;

    expect(game.player.leaderId).toBe('mashiro');
    expect(game.enemy.leaderId).toBe('yashiro');

    const playerLeader = game.player.members.find((member) => member.defId === game.player.leaderId)!;
    const enemyLeader = game.enemy.members.find((member) => member.defId === game.enemy.leaderId)!;

    expect(getStatusStacks(playerLeader, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(
      STANDARD_GAME_DEFINITION.rules.leaderStressBonus,
    );
    expect(getStatusStacks(enemyLeader, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(
      STANDARD_GAME_DEFINITION.rules.leaderStressBonus,
    );
  });

  it('Tutorial fixed decks do not erase gameStart card effects', () => {
    useGameStore.getState().startTutorial();
    const game = useGameStore.getState().game!;

    expect(game.enemy.members.some((member) => member.defId === 'happy')).toBe(true);
    expect(game.enemy.hand.slice(0, 2).map((card) => card.cardId)).toEqual(TUTORIAL_ENEMY_DECK.slice(0, 2));
    expect(game.enemy.hand).toHaveLength(STANDARD_GAME_DEFINITION.rules.initialHandSize + 3);
    expect(game.enemy.hand.slice(2).every((card) => CARDS[card.cardId]?.kind === 'coordination')).toBe(true);
  });

  it('Shennau external immunity blocks cards that target Shennau work', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['shennau', 'pintbox', 'mashiro'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'shennau')!;
    game.player.hand.push({ instanceId: 'immune-rush', cardId: 'rush' });

    expect(engine.playCard('player', 'immune-rush', { workId: work.id })).toBe(false);
    expect(work.slots.every((slot) => slot.design === undefined && slot.text === undefined && slot.aa === undefined)).toBe(true);
    expect(game.player.hand.some((card) => card.instanceId === 'immune-rush')).toBe(true);
  });

  it('Shennau external immunity ignores team-wide card effects while teammates still receive them', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['shennau', 'pintbox', 'mashiro'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);
    const shennau = game.player.members.find((member) => member.defId === 'shennau')!;
    const pintbox = game.player.members.find((member) => member.defId === 'pintbox')!;
    shennau.stress = 1;
    pintbox.stress = 1;
    game.player.hand.push({ instanceId: 'immune-voice', cardId: 'voice' });

    expect(engine.playCard('player', 'immune-voice', { voiceMode: 'relief' })).toBe(true);
    expect(shennau.stress).toBe(1);
    expect(pintbox.stress).toBe(0);
  });
});
