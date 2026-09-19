from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def rep(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f'expected snippet not found in {path}: {old[:160]!r}')
    write(path, text.replace(old, new, count))


# Mumi resonance now keys off the character's effective Stress cap rather than hardcoded 3.
rep(
    'src/game/customEffects.ts',
    "  const projected = typeof effect.args?.projectedStress === 'number' ? effect.args.projectedStress : 0;\n  if (member.stress + projected < 3) return false;\n  const work = ownerWork(context, engine);",
    "  const projected = typeof effect.args?.projectedStress === 'number' ? effect.args.projectedStress : 0;\n  const maxStress = engine.getEffectiveMaxStress(context.ownerTeamId, context.ownerId);\n  if (maxStress === undefined || maxStress === null || member.stress + projected <= maxStress) return false;\n  const work = ownerWork(context, engine);",
)
rep(
    'src/game/customEffects.ts',
    "  work.type = '怪';\n  member.skillUsage[key] = 1;",
    "  work.type = '怪';\n  work.extraTypes = [];\n  member.skillUsage[key] = 1;",
)

# Align the public character text with the finalized threshold wording.
rep(
    'src/content/orangeangel.ts',
    "sourceNotes: ['2026-09-12 PintBox：Text1/Design0/AA0，壓力2，適性（情）（怪）；工作與有組長權限使用統籌卡時額外+1壓力；壓力首次>=3時1d6填剩餘進度並將作品改為（怪）。']",
    "sourceNotes: ['2026-09-13 latest：Text1/Design0/AA0，壓力2，適性（情）（怪）；工作與有組長權限使用統籌卡時額外+1壓力；Stress 首次超過自身 effective 壓力上限時，以獨立 1d6 填剩餘進度並將作品 replace 成（怪）。']",
)
rep(
    'src/content/orangeangel.ts',
    "{ id: 'orangeangelResonance', name: '姆咪共鳴', description: '壓力首次到達 3 時，以獨立 1d6 填充自己作品剩餘進度，並把作品類型改為（怪）。'",
    "{ id: 'orangeangelResonance', name: '姆咪共鳴', description: 'Stress 首次超過自身壓力上限時，以獨立 1d6 填充自己作品剩餘進度，並把作品類型改為（怪）。'",
)

# Document Weakzhi's existing direct-to-work final settlement boundary.
rep(
    'src/content/weakzhi.ts',
    "    '2026-09-13 使用者定案：弱智技能暫不改動，不採用依剩餘 Stress 決定最終填槽數量的新版本。',",
    "    '2026-09-13 使用者定案：弱智技能暫不改動，不採用依剩餘 Stress 決定最終填槽數量的新版本。',\n    '2026-09-14 規則澄清：最後三天趕稿的 final-fill 直接進入作品結算，不進 pending dice，因此不能被審稿 / reroll 攔截。',",
)

write('src/tests/discussion-p2e-boundaries.test.ts', """import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

function createCase(playerMemberIds: string[], rng: () => number = () => 0) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
    playerMemberIds,
    enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
  });
  return { game, engine: new EngineSession(game, rng, STANDARD_GAME_DEFINITION) };
}

describe('2026-09-19 P2E finalized boundaries', () => {
  it('姆咪共鳴 does not trigger merely by reaching the non-leader Stress cap, but triggers on first exceed', () => {
    const { game, engine } = createCase(['mashiro', 'orangeangel', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    work.type = '情';
    work.extraTypes = ['笑'];
    member.stress = 1;

    engine.adjustStress('player', 'orangeangel', 1, 'exact-cap', true, 'narrator');
    expect(member.stress).toBe(2);
    expect(work.type).toBe('情');
    expect(work.slots.every((slot) => slot.design === undefined && slot.text === undefined && slot.aa === undefined)).toBe(true);

    engine.adjustStress('player', 'orangeangel', 1, 'over-cap', true, 'narrator');
    expect(member.stress).toBe(3);
    expect(work.type).toBe('怪');
    expect(work.extraTypes).toEqual([]);
    expect(work.slots.every((slot) => slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined)).toBe(true);
  });

  it('姆咪共鳴 uses effective maxStress, including the leader bonus', () => {
    const { game, engine } = createCase(['orangeangel', 'mashiro', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    const cap = engine.getEffectiveMaxStress('player', 'orangeangel')!;
    expect(cap).toBe(4);
    member.stress = cap - 1;
    work.type = '情';

    engine.adjustStress('player', 'orangeangel', 1, 'leader-cap', true, 'narrator');
    expect(member.stress).toBe(cap);
    expect(work.type).toBe('情');

    engine.adjustStress('player', 'orangeangel', 1, 'leader-over-cap', true, 'narrator');
    expect(member.stress).toBe(cap + 1);
    expect(work.type).toBe('怪');
  });

  it('work-time projected Stress can trigger 姆咪共鳴 exactly when the normal work fee will exceed the cap', () => {
    const { game, engine } = createCase(['mashiro', 'orangeangel', 'pintbox']);
    const member = engine.getCharacter('player', 'orangeangel')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'orangeangel')!;
    member.stress = 1;
    work.type = '情';

    engine.skills.emit({
      type: 'afterRollBatch',
      teamId: 'player',
      actorId: 'orangeangel',
      dice: [],
      amount: 0,
      sourceKind: 'work',
    });

    // 精神不穩先 +1，此時為 2；共鳴預看接下來一般工作 +1，最終 3 > cap 2。
    expect(member.stress).toBe(2);
    expect(work.type).toBe('怪');
    expect(work.slots.every((slot) => slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined)).toBe(true);
  });

  it('弱智 final-fill never enters pending dice and cannot be changed by Pintbox review', () => {
    const { game, engine } = createCase(['pintbox', 'weakzhi', 'mashiro']);
    game.round = game.maxRounds;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'weakzhi')!;
    work.slots.forEach((slot) => {
      delete slot.design;
      delete slot.text;
      delete slot.aa;
    });

    engine.skills.emit({ type: 'roundEnd' });
    const settled = JSON.parse(JSON.stringify(work.slots));
    expect(game.player.pendingDice.some((die) => die.ownerId === 'weakzhi')).toBe(false);
    expect(work.slots.every((slot) => slot.design === 1 && slot.text === 1 && slot.aa === 1)).toBe(true);

    const low = engine.grantDice('player', 'mashiro', 'design', 1, 'review-control', false, 1)[0]!;
    low.value = 1;
    expect(engine.activateSkill('player', 'pintbox', 'pintboxBasicRequirements')).toBe(true);
    expect(work.slots).toEqual(settled);
    expect(game.player.pendingDice.some((die) => die.ownerId === 'weakzhi')).toBe(false);
  });
});
""")

print('P2E resonance/final-fill boundary patch applied successfully.')
