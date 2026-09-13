import { describe, expect, it } from 'vitest';
import affinitySource from '../components/CharacterAffinities.tsx?raw';
import characterCardSource from '../components/CharacterCard.tsx?raw';
import rosterSource from '../components/CharacterRosterDialog.tsx?raw';
import drawPhaseSource from '../components/DrawPhaseScreen.tsx?raw';

describe('character affinity UI', () => {
  it('renders affinity values through the shared display', () => {
    expect(affinitySource).toContain('適性');
    expect(affinitySource).toContain('affinities.map');
    expect(affinitySource).toContain('aria-label={`適性：${label}`}');
  });

  it('shows affinities in each player-facing character view', () => {
    expect(characterCardSource).toContain(
      '<CharacterAffinities affinities={definition.affinities} compact={compact} />',
    );
    expect(rosterSource).toContain('<CharacterAffinities affinities={character.affinities} />');
    expect(drawPhaseSource).toContain('<CharacterAffinities affinities={character.affinities} />');
  });
});
