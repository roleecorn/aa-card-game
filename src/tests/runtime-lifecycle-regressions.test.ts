import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { EngineSession, applyLeaderStressBonuses, createInitialGame } from '../game/engine';
import { GAMEPLAY_STATUS, getStatusStacks } from '../game/statuses';

const STANDARD_ENEMY = ['narrator', 'ginsakura', 'bluewind'];

function fixedRng(value: number) {
  return () => value;
}

describe('runtime lifecycle regressions', () => {
  it('does not restore a departed Yamada work batch after writer block triggers vanish', () => {
    const game = createInitialGame(fixedRng(0), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['yamada', 'pintbox', 'mashiro'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    // Isolate the mid-action departure regression from the separate startup-bonus regression.
    applyLeaderStressBonuses(game, STANDARD_GAME_DEFINITION);
    const engine = new EngineSession(game, fixedRng(0), STANDARD_GAME_DEFINITION);
    const yamada = game.player.members.find((member) => member.defId === 'yamada')!;

    yamada.stress = 2;
    yamada.statuses.writerBlock = { stacks: 1 };

    engine.performPlayerActions({ yamada: 'work', pintbox: 'slack', mashiro: 'slack' });

    expect(game.player.members.some((member) => member.defId === 'yamada')).toBe(false);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'yamada')).toBe(false);
  });

  it('Shennau external immunity excludes them from another character skill target selection', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['yashiro', 'shennau', 'mashiro'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);
    const shennau = game.player.members.find((member) => member.defId === 'shennau')!;
    const mashiro = game.player.members.find((member) => member.defId === 'mashiro')!;

    shennau.stress = 2;
    mashiro.stress = 1;

    engine.skills.emit({ type: 'roundStart' });

    expect(shennau.stress).toBe(2);
    expect(mashiro.stress).toBe(0);
  });

  it('Pintbox AI does not cancel the Stress cost of a coordination card played by Pintbox', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);
    const pintbox = game.player.members.find((member) => member.defId === 'pintbox')!;
    const mashiro = game.player.members.find((member) => member.defId === 'mashiro')!;
    mashiro.stress = 2;
    game.player.hand.push({ instanceId: 'pintbox-soothe', cardId: 'soothe' });

    expect(engine.playCard('player', 'pintbox-soothe', { memberId: 'mashiro' })).toBe(true);
    expect(pintbox.stress).toBe(1);
  });

  it('Pintbox AI still reduces source-less delayed external Stress effects', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    const engine = new EngineSession(game, fixedRng(0.5), STANDARD_GAME_DEFINITION);
    const pintbox = game.player.members.find((member) => member.defId === 'pintbox')!;

    engine.adjustStress('player', 'pintbox', 2, '卡文', true);

    expect(pintbox.stress).toBe(1);
  });

  it('createInitialGame applies leader Stress bonuses as part of match initialization', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'mashiro', 'user79'],
      enemyMemberIds: STANDARD_ENEMY,
    });
    const playerLeader = game.player.members.find((member) => member.defId === game.player.leaderId)!;
    const enemyLeader = game.enemy.members.find((member) => member.defId === game.enemy.leaderId)!;

    expect(getStatusStacks(playerLeader, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(
      STANDARD_GAME_DEFINITION.rules.leaderStressBonus,
    );
    expect(getStatusStacks(enemyLeader, GAMEPLAY_STATUS.leaderStressCapBonus)).toBe(
      STANDARD_GAME_DEFINITION.rules.leaderStressBonus,
    );
  });
});
