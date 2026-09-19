from pathlib import Path
import re


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected snippet not found in {path}: {old[:120]}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


def regex_replace(path: str, pattern: str, repl: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    updated, matches = re.subn(pattern, repl, text, count=count, flags=re.S)
    if matches != count:
        raise SystemExit(f'expected {count} regex match(es) in {path}, got {matches}')
    p.write_text(updated, encoding='utf-8')


write('src/content/kitsu.ts', """import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const kitsuCharacter = characterDefinitionSchema.parse({
  id: 'kitsu',
  name: 'キツ',
  stats: { design: 1, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['笑', '怪'],
  skillIds: ['kitsuHappyElement', 'kitsuAkihabara'],
  tags: ['qa', 'regression'],
  portrait: 'assets/characters/portrait/kitsu.webp',
  compactPortrait: 'assets/characters/compact/kitsu.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-15 final：Design 1 / Text 1 / AA 2，Stress 4，適性（笑 / 怪）。',
    '「恰到好處的高興素」：組內若存在其他類型包含「怪」的作品，自身 Text +1；只判斷存在，不按件數疊加。',
    '「妙梗連發的秋葉原」：組內若存在其他類型包含「笑」的作品，自身 Design +1；只判斷存在，不按件數疊加。',
    '舊「重播三十次」已被本版完整覆蓋。',
  ],
});

export const kitsuSkills = skillDefinitionSchema.array().parse([
  {
    id: 'kitsuHappyElement',
    name: '恰到好處的高興素',
    description: '若我方存在其他類型包含「怪」的作品，自身 Text +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{
      kind: 'stat.workTypeCount',
      skill: 'text',
      workType: '怪',
      amountPerWork: 1,
      excludeOwnerWork: true,
      maxBonus: 1,
    }],
  },
  {
    id: 'kitsuAkihabara',
    name: '妙梗連發的秋葉原',
    description: '若我方存在其他類型包含「笑」的作品，自身 Design +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{
      kind: 'stat.workTypeCount',
      skill: 'design',
      workType: '笑',
      amountPerWork: 1,
      excludeOwnerWork: true,
      maxBonus: 1,
    }],
  },
]);
""")

write('src/tests/discussion-p2d-kitsu.test.ts', """import { describe, expect, it } from 'vitest';
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
""")

# Migrate the old prototype expectations that this final rewrite supersedes.
replace(
    'src/tests/skills.test.ts',
    "    for (const id of ['lemon', 'kitsu'] as const) {\n      expect(CHARACTERS[id]?.stats).toEqual({ design: 1, text: 1, aa: 1 });\n      expect(CHARACTERS[id]?.maxStress).toBe(5);\n    }",
    "    expect(CHARACTERS.lemon?.stats).toEqual({ design: 1, text: 1, aa: 1 });\n    expect(CHARACTERS.lemon?.maxStress).toBe(5);\n    expect(CHARACTERS.kitsu?.stats).toEqual({ design: 1, text: 1, aa: 2 });\n    expect(CHARACTERS.kitsu?.maxStress).toBe(4);",
)
regex_replace(
    'src/tests/skills.test.ts',
    r"describe\('キツ complete character package', \(\) => \{.*?\n\}\);\n\ndescribe\('generic effect vocabulary'",
    """describe('キツ complete character package', () => {
  it('uses the final discussion-backed stats and passive skills', () => {
    expect(CHARACTERS.kitsu?.stats).toEqual({ design: 1, text: 1, aa: 2 });
    expect(CHARACTERS.kitsu?.maxStress).toBe(4);
    expect(CHARACTERS.kitsu?.affinities).toEqual(['笑', '怪']);
    expect(SKILLS.kitsuHappyElement?.status).toBe('implemented');
    expect(SKILLS.kitsuAkihabara?.status).toBe('implemented');
    expect(SKILLS.kitsuReplayThirty).toBeUndefined();
  });
});

describe('generic effect vocabulary'""",
)

print('P2D Kitsu patch applied successfully.')
