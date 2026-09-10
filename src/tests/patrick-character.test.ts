import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_CONTENT, SKILLS } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['patrick', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('派大星 complete character package', () => {
  it('uses prototype stats/assets and only gameplay/content tags', () => {
    expect(CHARACTERS.patrick?.stats).toEqual({ design: 2, text: 2, aa: 1 });
    expect(CHARACTERS.patrick?.maxStress).toBe(4);
    expect(CHARACTERS.patrick?.tags).toEqual(expect.arrayContaining(['systems-thinker', 'review']));
    expect(CHARACTERS.patrick?.tags).not.toContain('graph-selected');
    expect(CHARACTERS.patrick?.portrait).toBe('/assets/characters/portrait/patrick.webp');
    expect(CHARACTERS.patrick?.compactPortrait).toBe('/assets/characters/compact/patrick.webp');
    expect(SKILLS.patrickConsistencyCheck?.status).toBe('implemented');
  });

  it('一致性檢查 rerolls the lowest filled die in the owner work once per round', () => {
    const game = createInitialGame(() => 0.999, DEFAULT_CONTENT, ROSTER);
    const engine = new EngineSession(game, () => 0.999);
    const work = game.player.works.find((item) => item.ownerId === 'patrick')!;
    work.slots[0] = { design: 1, text: 4, aa: 5 };

    expect(engine.activateSkill('player', 'patrick', 'patrickConsistencyCheck')).toBe(true);
    expect(work.slots[0]?.design).toBe(6);
    expect(engine.activateSkill('player', 'patrick', 'patrickConsistencyCheck')).toBe(false);
  });
});
