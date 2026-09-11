import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';
import drawPhaseSource from '../components/DrawPhaseScreen.tsx?raw';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import type { GameDefinition } from '../game/gameDefinition';
import { useGameStore } from '../store/gameStore';

function compactDefinition(): GameDefinition {
  return {
    ...STANDARD_GAME_DEFINITION,
    id: 'ui-compact-test',
    rules: {
      ...STANDARD_GAME_DEFINITION.rules,
      maxRounds: 2,
      teamSize: 2,
      initialHandSize: 1,
      cardsPerRound: 1,
      handLimit: 3,
      leaderStressBonus: 7,
      workLength: 3,
      missingWorkStatScore: -5,
      player: { name: 'Compact Player' },
      enemy: { name: 'Compact Enemy' },
    },
    roster: { excludedCharacterIds: [] },
  };
}

describe('active GameDefinition boundary', () => {
  it('lets the Store start and retain a non-Standard GameDefinition', () => {
    const definition = compactDefinition();
    const store = useGameStore.getState();
    store.reset();

    expect(() => store.startGame(
      ['pintbox', 'mashiro'],
      ['narrator', 'ginsakura'],
      'pintbox',
      definition,
    )).not.toThrow();

    const next = useGameStore.getState();
    expect(next.gameDefinition).toBe(definition);
    expect(next.game?.maxRounds).toBe(2);
    expect(next.game?.player.members).toHaveLength(2);
    expect(next.game?.player.name).toBe('Compact Player');
  });

  it('does not bind App roster setup or draw copy directly to Standard constants', () => {
    expect(appSource).not.toContain('selectStandardRosters(Math.random, STANDARD_GAME_DEFINITION)');
    expect(appSource).not.toContain('STANDARD_GAME_DEFINITION.roster.excludedCharacterIds');
    expect(appSource).not.toContain('STANDARD_GAME_DEFINITION.content.characters');
    expect(drawPhaseSource).not.toContain('組長本局壓力上限 +2');
    expect(drawPhaseSource).toContain('leaderStressBonus');
  });
});
