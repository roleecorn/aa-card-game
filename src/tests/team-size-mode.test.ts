import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';
import startScreenSource from '../components/StartScreen.tsx?raw';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, selectStandardRosters } from '../game/engine';
import type { GameDefinition } from '../game/gameDefinition';

function definitionWithTeamSize(teamSize: 3 | 5): GameDefinition {
  return {
    ...STANDARD_GAME_DEFINITION,
    id: `standard-${teamSize}`,
    rules: {
      ...STANDARD_GAME_DEFINITION.rules,
      teamSize,
    },
  };
}

function fixedRng() {
  return 0.37;
}

describe('three and five member match modes', () => {
  it.each([3, 5] as const)('creates %i characters and one work per character for both teams', (teamSize) => {
    const definition = definitionWithTeamSize(teamSize);
    const selected = selectStandardRosters(fixedRng, definition);
    const game = createInitialGame(fixedRng, definition, {
      playerMemberIds: selected.playerMemberIds,
      enemyMemberIds: selected.enemyMemberIds,
    });

    expect(selected.playerMemberIds).toHaveLength(teamSize);
    expect(selected.enemyMemberIds).toHaveLength(teamSize);
    expect(game.player.members).toHaveLength(teamSize);
    expect(game.enemy.members).toHaveLength(teamSize);
    expect(game.player.works).toHaveLength(teamSize);
    expect(game.enemy.works).toHaveLength(teamSize);
    expect(game.player.works.map((work) => work.ownerId).sort()).toEqual(
      game.player.members.map((member) => member.defId).sort(),
    );
    expect(game.enemy.works.map((work) => work.ownerId).sort()).toEqual(
      game.enemy.members.map((member) => member.defId).sort(),
    );
  });

  it('offers both modes after Start Game and carries the selected GameDefinition into the match', () => {
    expect(startScreenSource).toContain('3 人模式');
    expect(startScreenSource).toContain('5 人模式');
    expect(startScreenSource).toContain('chooseTeamSize(3)');
    expect(startScreenSource).toContain('chooseTeamSize(5)');
    expect(appSource).toContain('teamSize,');
    expect(appSource).toContain('draftRoster.gameDefinition');
    expect(appSource).toContain('startGame(draftRoster.player, draftRoster.enemy, leaderId, draftRoster.gameDefinition)');
  });
});
