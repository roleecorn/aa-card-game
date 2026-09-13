import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

describe('派大星 complete character package', () => {
  it('uses the calibrated gameplay values and 派式求救', () => {
    expect(CHARACTERS.patrick?.stats).toEqual({ design: 0, text: 0, aa: 1 });
    expect(CHARACTERS.patrick?.maxStress).toBe(3);
    expect(CHARACTERS.patrick?.affinities).toEqual(['謀']);
    expect(CHARACTERS.patrick?.skillIds).toEqual(['patrickHelp']);
    expect(SKILLS.patrickHelp?.status).toBe('implemented');
    expect(CHARACTERS.patrick?.portrait).toBe('/assets/characters/portrait/patrick.webp');
    expect(CHARACTERS.patrick?.compactPortrait).toBe('/assets/characters/compact/patrick.webp');
  });

  it('派式求救 adds one leader Stress and two Guide cards once per round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['patrick', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const leader = game.player.members.find((member) => member.defId === game.player.leaderId)!;
    const beforeGuide = game.player.hand.filter((card) => card.cardId === 'guide').length;

    expect(engine.activateSkill('player', 'patrick', 'patrickHelp')).toBe(true);
    expect(leader.stress).toBe(1);
    expect(game.player.hand.filter((card) => card.cardId === 'guide')).toHaveLength(beforeGuide + 2);
    expect(engine.activateSkill('player', 'patrick', 'patrickHelp')).toBe(false);
  });
});
