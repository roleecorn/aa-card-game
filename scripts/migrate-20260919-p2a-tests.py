from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected legacy snippet not found in {path}: {old[:100]}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


def regex_replace(path: str, pattern: str, repl: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    updated, matches = re.subn(pattern, repl, text, count=count, flags=re.S)
    if matches != count:
        raise SystemExit(f'expected {count} regex match(es) in {path}, got {matches}')
    p.write_text(updated, encoding='utf-8')


# The leader gets the normal +2 Stress-cap bonus; test the effective cap, not base maxStress.
replace(
    'src/tests/discussion-p2a-characters.test.ts',
    "    engine.getCharacter('player', 'avocado')!.stress = 3;\n    expect(engine.canUseActiveSkill('avocado', 'avocadoGameTech')).toBe(false);",
    "    const avocadoCap = engine.getEffectiveMaxStress('player', 'avocado')!;\n    engine.getCharacter('player', 'avocado')!.stress = avocadoCap;\n    expect(engine.canUseActiveSkill('avocado', 'avocadoGameTech')).toBe(false);",
)

# P0 Guide semantics remain valid; Avocado's final Design is now 2, so exercise its AA 0 -> 1 instead.
replace(
    'src/tests/discussion-p0-rules.test.ts',
    "    expect(target.permanentStats.design).toBe(1);\n\n    expect(engine.playCard('player', 'guide-test', { memberId: 'avocado', skill: 'design' })).toBe(true);\n    expect(leader.stress).toBe(0);\n    expect(target.stress).toBe(1);\n    expect(target.permanentStats.design).toBe(2);",
    "    expect(target.permanentStats.aa).toBe(0);\n\n    expect(engine.playCard('player', 'guide-test', { memberId: 'avocado', skill: 'aa' })).toBe(true);\n    expect(leader.stress).toBe(0);\n    expect(target.stress).toBe(1);\n    expect(target.permanentStats.aa).toBe(1);",
)

# The two older Pintbox contracts were explicitly superseded by the once-per-round manual team review.
regex_replace(
    'src/tests/skill-runtime-regressions.test.ts',
    r"  it\('Pintbox 審稿 rerolls every allied low pending die and charges each die owner', \(\) => \{.*?\n  \}\);\n\n  it\('Pintbox 基本要求 repeatedly reviews both the work batch and existing pending dice until they are at least 3', \(\) => \{.*?\n  \}\);",
    """  it('Pintbox legacy 審稿 active skill is removed', () => {
    const { engine } = createSkillHarness({ player: ['pintbox'] });
    const die = engine.grantDice('player', SKILL_FIXTURES.playerA, 'text', 1, 'setup', false)[0]!;
    die.value = 2;
    expect(engine.activateSkill('player', 'pintbox', 'pintboxReview', { targetDieId: die.id })).toBe(false);
  });

  it('Pintbox 基本要求 no longer auto-triggers on a work batch and manually reviews pending dice only', () => {
    const { game, engine } = createSkillHarness({ player: ['pintbox'] });
    const pending = engine.grantDice('player', SKILL_FIXTURES.playerB, 'design', 1, 'setup', false)[0]!;
    pending.value = 1;
    const batch: DieToken[] = [{
      id: 'batch-low', ownerId: SKILL_FIXTURES.playerA, skill: 'text', value: 2, round: game.round, origin: '工作',
    }];

    engine.skills.emit({ type: 'afterRollBatch', teamId: 'player', actorId: SKILL_FIXTURES.playerA,
      dice: batch, amount: 1, sourceKind: 'work' });
    expect(pending.value).toBe(1);
    expect(batch[0]!.value).toBe(2);

    expect(engine.activateSkill('player', 'pintbox', 'pintboxBasicRequirements')).toBe(true);
    expect(pending.value).toBeGreaterThanOrEqual(3);
    expect(batch[0]!.value).toBe(2);
  });""",
)

# Character calibration blocks that referenced the old prototype definitions.
replace(
    'src/tests/skills.test.ts',
    "    for (const id of ['lemon', 'avocado', 'kitsu'] as const) {\n      expect(CHARACTERS[id]?.stats).toEqual({ design: 1, text: 1, aa: 1 });\n      expect(CHARACTERS[id]?.maxStress).toBe(5);\n    }",
    "    for (const id of ['lemon', 'kitsu'] as const) {\n      expect(CHARACTERS[id]?.stats).toEqual({ design: 1, text: 1, aa: 1 });\n      expect(CHARACTERS[id]?.maxStress).toBe(5);\n    }\n    expect(CHARACTERS.avocado?.stats).toEqual({ design: 2, text: 1, aa: 0 });\n    expect(CHARACTERS.avocado?.maxStress).toBe(3);",
)
regex_replace(
    'src/tests/skills.test.ts',
    r"describe\('酪梨 complete character package', \(\) => \{.*?\n\}\);\n\ndescribe\('キツ complete character package'",
    """describe('酪梨 complete character package', () => {
  const AVOCADO_ROSTER = {
    playerMemberIds: ['avocado', 'emotion', 'lemon'],
    enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
  };

  it('uses the final P2 stats, affinity and skills', () => {
    expect(CHARACTERS.avocado?.stats).toEqual({ design: 2, text: 1, aa: 0 });
    expect(CHARACTERS.avocado?.maxStress).toBe(3);
    expect(CHARACTERS.avocado?.affinities).toEqual(['謀']);
    expect(CHARACTERS.avocado?.skillIds).toEqual(['avocadoGameTech', 'avocadoNeedsManual']);
    expect(SKILLS.avocadoGameTech?.status).toBe('implemented');
    expect(SKILLS.avocadoNeedsManual?.status).toBe('implemented');
  });

  it('no longer adds a Guide card at game start', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, AVOCADO_ROSTER);
    expect(game.player.hand).toHaveLength(STANDARD_GAME_DEFINITION.rules.initialHandSize);
  });
});

describe('キツ complete character package'""",
)
replace(
    'src/tests/skills.test.ts',
    "    expect(CHARACTERS.happy?.stats).toEqual({ design: 3, text: 0, aa: 0 });",
    "    expect(CHARACTERS.happy?.stats).toEqual({ design: 3, text: 0, aa: 1 });",
)
regex_replace(
    'src/tests/skills.test.ts',
    r"  it\('turns a work into 怪 when 高興 places a die into it', \(\) => \{.*?\n  \}\);",
    """  it('高興素 adds 怪 at game start and no longer replaces a work type on placement', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, HAPPY_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    const work = game.player.works.find((item) => item.ownerId === 'pintbox')!;
    expect(engine.getWorkTypes(work)).toEqual(expect.arrayContaining([work.type, '怪']));
    const beforeType = work.type;
    const die = engine.grantDice('player', 'happy', 'design', 1, 'test', false, 4)[0]!;
    die.value = 4;
    expect(engine.placeDie('player', die.id, work.id, 0)).toBe(true);
    expect(work.type).toBe(beforeType);
  });""",
)

print('P2A legacy test migration applied successfully.')
