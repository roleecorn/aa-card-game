from pathlib import Path
import re


def regex_replace(path: str, pattern: str, repl: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    updated, matches = re.subn(pattern, repl, text, count=count, flags=re.S)
    if matches != count:
        raise SystemExit(f'expected {count} regex match(es) in {path}, got {matches}')
    p.write_text(updated, encoding='utf-8')


regex_replace(
    'src/tests/blocking.test.ts',
    r"  it\('conditional active skills reject activation until their work condition is met', \(\) => \{.*?\n  \}\);",
    """  it('removed Meteor reroll skill cannot be activated after the P2 rewrite', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['meteor', 'lemon', 'tanxi'],
      enemyMemberIds: ['pintbox', 'mashiro', 'narrator'],
    });
    const engine = new EngineSession(game, fixedRng(0.5));
    const die = engine.grantDice('player', 'meteor', 'text', 1, 'test', false, 4)[0]!;
    expect(engine.activateSkill('player', 'meteor', 'meteorResonance', { targetDieId: die.id })).toBe(false);
  });""",
)

regex_replace(
    'src/tests/skill-targeting-contracts.test.ts',
    r"  it\('流星 only exposes 軌之共鳴 when the owner work is 燃 and a pending die exists', \(\) => \{.*?\n  \}\);",
    """  it('流星新版軌之共鳴是 passive，不建立 active target candidates', () => {
    const { engine } = createSkillHarness({ player: ['meteor'] });
    engine.grantDice('player', 'meteor', 'text', 1, 'setup', false);
    expect(getSkillAvailability(engine, 'meteor', 'meteorResonance').allowed).toBe(false);
    expect(getSkillSelectionPlan(engine, 'meteor', 'meteorResonance').candidates).toHaveLength(0);
  });""",
)

regex_replace(
    'src/tests/skills.test.ts',
    r"  it\('軌言軌語 gives Design \+1 for a 燃 work and 軌之共鳴 rerolls one die once per round', \(\) => \{.*?\n  \}\);",
    """  it('軌之共鳴 scales with every allied 燃 work and 軌言軌語 applies the fixed -1', () => {
    const game = createInitialGame(fixedRng(0.999), STANDARD_GAME_DEFINITION, METEOR_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.999));
    for (const work of game.player.works) {
      work.extraTypes = [];
      work.type = work.ownerId === 'mashiro' ? '情' : '燃';
    }
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(1); // base 0 + 2 燃 - 1

    const mashiroWork = game.player.works.find((item) => item.ownerId === 'mashiro')!;
    mashiroWork.extraTypes = ['燃'];
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(2); // base 0 + 3 燃 - 1
    expect(SKILLS.meteorBurnDesign?.activation).toBe('passive');
    expect(SKILLS.meteorResonance?.activation).toBe('passive');
  });""",
)

print('P2B legacy Meteor tests migrated successfully.')
