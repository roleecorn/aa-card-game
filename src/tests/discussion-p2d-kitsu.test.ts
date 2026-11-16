import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

function createCase() {
  const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
    playerMemberIds: ['kitsu', 'avocado', 'emotion'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  });
  return { game, engine: new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION) };
}

function work(engine: EngineSession, ownerId: string) {
  return engine.getTeam('player').works.find((candidate) => candidate.ownerId === ownerId)!;
}

describe('2026-09-19 P2D Kitsu rewrite', () => {
  it('uses the final stats, Stress cap, affinities and two passive skills', () => {
    expect(CHARACTERS.kitsu?.stats).toEqual({ design: 1, text: 1, aa: 2 });
    expect(CHARACTERS.kitsu?.maxStress).toBe(4);
    expect(CHARACTERS.kitsu?.affinities).toEqual(['笑', '怪']);
    expect(CHARACTERS.kitsu?.skillIds).toEqual(['kitsuHappyElement', 'kitsuAkihabara']);
    expect(SKILLS.kitsuHappyElement?.status).toBe('implemented');
    expect(SKILLS.kitsuAkihabara?.status).toBe('implemented');
    expect(SKILLS.kitsuReplayThirty).toBeUndefined();
  });

  it('恰到好處的高興素 grants Text +1 only when another work contains 怪', () => {
    const { engine } = createCase();
    const own = work(engine, 'kitsu');
    const avocado = work(engine, 'avocado');
    const emotion = work(engine, 'emotion');
    own.type = '怪'; own.extraTypes = [];
    avocado.type = '謀'; avocado.extraTypes = [];
    emotion.type = '情'; emotion.extraTypes = [];
    expect(engine.getEffectiveStat('kitsu', 'text')).toBe(1); // own 怪 does not count.

    avocado.extraTypes = ['怪'];
    expect(engine.getEffectiveStat('kitsu', 'text')).toBe(2);

    emotion.type = '怪';
    expect(engine.getEffectiveStat('kitsu', 'text')).toBe(2); // existence only; no stacking.
  });

  it('妙梗連發的秋葉原 grants Design +1 only when another work contains 笑', () => {
    const { engine } = createCase();
    const own = work(engine, 'kitsu');
    const avocado = work(engine, 'avocado');
    const emotion = work(engine, 'emotion');
    own.type = '笑'; own.extraTypes = [];
    avocado.type = '謀'; avocado.extraTypes = [];
    emotion.type = '情'; emotion.extraTypes = [];
    expect(engine.getEffectiveStat('kitsu', 'design')).toBe(1); // own 笑 does not count.

    avocado.extraTypes = ['笑'];
    expect(engine.getEffectiveStat('kitsu', 'design')).toBe(2);

    emotion.type = '笑';
    expect(engine.getEffectiveStat('kitsu', 'design')).toBe(2); // existence only; no stacking.
  });
});
