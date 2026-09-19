import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

function createCase(ids: string[]) {
  const enemyIds = ['narrator', 'ginsakura', 'bluewind'];
  const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
    playerMemberIds: ids,
    enemyMemberIds: enemyIds,
  });
  return { game, engine: new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION) };
}

function setTypes(
  engine: EngineSession,
  ownerId: string,
  primary: '燃' | '謀' | '笑' | '情' | '怪',
  extras: Array<'燃' | '謀' | '笑' | '情' | '怪'> = [],
) {
  const work = engine.getTeam('player').works.find((item) => item.ownerId === ownerId)!;
  work.type = primary;
  work.extraTypes = [...extras];
  return work;
}

describe('2026-09-19 P2B team work-type scaling', () => {
  it('E keeps final stats, all affinity, and gains Text once for every allied work containing 笑', () => {
    const { engine } = createCase(['e', 'mashiro', 'happy']);
    expect(CHARACTERS.e?.stats).toEqual({ design: 3, text: 2, aa: 0 });
    expect(CHARACTERS.e?.maxStress).toBe(4);
    expect(engine.getEffectiveAffinity('e')).toBe('all');
    expect(SKILLS.eSelectedJokes?.activation).toBe('passive');

    setTypes(engine, 'e', '燃', ['笑']);
    setTypes(engine, 'mashiro', '笑');
    setTypes(engine, 'happy', '怪');
    expect(engine.getEffectiveStat('e', 'text')).toBe(4);

    setTypes(engine, 'happy', '怪', ['笑']);
    expect(engine.getEffectiveStat('e', 'text')).toBe(5);
  });

  it('流星 applies +1 Design for each allied 燃 work and then its fixed -1 modifier', () => {
    const { engine } = createCase(['meteor', 'mashiro', 'lemon']);
    setTypes(engine, 'meteor', '燃');
    setTypes(engine, 'mashiro', '燃');
    setTypes(engine, 'lemon', '情');
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(1); // 0 +2 -1

    setTypes(engine, 'lemon', '情', ['燃']);
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(2); // 0 +3 -1

    setTypes(engine, 'meteor', '情');
    setTypes(engine, 'mashiro', '情');
    setTypes(engine, 'lemon', '情');
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(0); // floor at zero
    expect(SKILLS.meteorResonance?.activation).toBe('passive');
    expect(SKILLS.meteorBurnDesign?.activation).toBe('passive');
  });

  it('Enki Text modifier is exactly allied 謀 work count minus one and recognizes additive types', () => {
    const { engine } = createCase(['enki', 'mashiro', 'user79']);
    setTypes(engine, 'enki', '謀');
    setTypes(engine, 'mashiro', '情');
    setTypes(engine, 'user79', '燃');
    expect(engine.getEffectiveStat('enki', 'text')).toBe(1); // base 1 + (1 - 1)

    setTypes(engine, 'mashiro', '情', ['謀']);
    expect(engine.getEffectiveStat('enki', 'text')).toBe(2);

    setTypes(engine, 'user79', '謀');
    expect(engine.getEffectiveStat('enki', 'text')).toBe(3);

    setTypes(engine, 'enki', '情');
    setTypes(engine, 'mashiro', '情');
    setTypes(engine, 'user79', '燃');
    expect(engine.getEffectiveStat('enki', 'text')).toBe(0); // base 1 + (0 - 1)
  });
});
