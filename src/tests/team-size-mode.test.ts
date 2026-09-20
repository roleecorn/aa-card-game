import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';
import drawPhaseSource from '../components/DrawPhaseScreen.tsx?raw';
import startScreenSource from '../components/StartScreen.tsx?raw';
import workBoardSource from '../components/WorkBoard.tsx?raw';
import workCardSource from '../components/WorkCard.tsx?raw';
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
    expect(appSource).toContain("setAppStage('work-types')");
    expect(appSource).toContain('draftRoster.gameDefinition,');
    expect(appSource).toContain('selections,');
  });

  it('lays out five drawn characters as a centered 3 + 2 desktop grid', () => {
    expect(drawPhaseSource).toContain("const fiveMemberLayout = characters.length === 5;");
    expect(drawPhaseSource).toContain("'repeat(6, minmax(0,1fr))'");
    expect(drawPhaseSource).toContain("'& > :nth-of-type(4)': { gridColumn: { xs: 'auto', md: '2 / span 2' } }");
    expect(drawPhaseSource).toContain("'& > :nth-of-type(5)': { gridColumn: { xs: 'auto', md: '4 / span 2' } }");
  });

  it('fits work cards to their container and keeps long works scrollable from the first slot', () => {
    expect(workBoardSource).toContain('const compactLayout = works.length === 5;');
    expect(workBoardSource).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))'");
    expect(workBoardSource).toContain('minWidth: 0');
    expect(workBoardSource).toContain('compactSlots={compactLayout}');
    expect(workCardSource).toContain('compactSlots?: boolean;');
    expect(workCardSource).toContain('`repeat(${work.slots.length}, 66px)`');
    expect(workCardSource).toContain("justifyContent: 'start'");
    expect(workCardSource).toContain("overflowX: 'auto'");
    expect(workCardSource).toContain('`repeat(${work.slots.length}, minmax(54px, 1fr))`');
  });
});
