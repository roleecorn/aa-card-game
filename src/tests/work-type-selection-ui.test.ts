import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, getInitialWorkTypeChoices } from '../game/engine';
import appSource from '../app/App.tsx?raw';
import screenSource from '../components/WorkTypeSelectionScreen.tsx?raw';
import storeSource from '../store/gameStore.ts?raw';
import protocolSource from '../online/protocol.ts?raw';
import sessionSource from '../online/onlineSession.ts?raw';


describe('initial work-type selection flow', () => {
  it('keeps the existing 謀 fallback for characters whose legacy data has no affinity yet', () => {
    expect(getInitialWorkTypeChoices('avocado')).toEqual(['謀']);
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['avocado', 'user79', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'happy'],
      playerWorkTypes: { avocado: '謀', user79: '燃', meteor: '燃' },
    });
    expect(game.player.works.find((work) => work.ownerId === 'avocado')?.type).toBe('謀');
  });

  it('collects work types before startGame so gameStart skills see the selected initial types', () => {
    expect(appSource).toContain("'work-types'");
    expect(appSource).toContain('<WorkTypeSelectionScreen');
    expect(appSource).toContain('handleConfirmWorkTypes');
    expect(storeSource).toContain('playerWorkTypes');
    expect(storeSource).toContain('enemyWorkTypes');
    expect(screenSource).toContain('getInitialWorkTypeChoices');
  });

  it('requires both online players to submit their own work types before Host creates the authoritative game', () => {
    expect(appSource).toContain("'online-work-types'");
    expect(appSource).toContain('onlineWorkTypeSelections.host');
    expect(appSource).toContain('onlineWorkTypeSelections.guest');
    expect(sessionSource).toContain('submitWorkTypes');
    expect(sessionSource).toContain("type: 'workTypes'");
    expect(protocolSource).toContain('ONLINE_PROTOCOL_VERSION = 3');
    expect(protocolSource).toContain("type: 'workTypes'");
  });
});
