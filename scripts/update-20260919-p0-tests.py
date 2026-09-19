from pathlib import Path


def replace_once(file: str, old: str, new: str) -> None:
    path = Path(file)
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected test block not found in {file}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/tests/character-calibration.test.ts',
    """  it('副組長力 only transfers coordination stress when the vice leader is below the leader', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'triangle', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, () => 0.5);
    const leader = engine.getCharacter('player', 'pintbox')!;
    const viceLeader = engine.getCharacter('player', 'triangle')!;

    leader.stress = 2;
    viceLeader.stress = 1;
    expect(engine.skills.getCoordinationStressBearer('player')).toBe('triangle');

    viceLeader.stress = 2;
    expect(engine.skills.getCoordinationStressBearer('player')).toBeUndefined();

    viceLeader.stress = 3;
    expect(engine.skills.getCoordinationStressBearer('player')).toBeUndefined();
  });""",
    """  it('副組長力 transfers coordination stress only when the vice leader has more remaining headroom', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['pintbox', 'triangle', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    });
    const engine = new EngineSession(game, () => 0.5);
    const leader = engine.getCharacter('player', 'pintbox')!;
    const viceLeader = engine.getCharacter('player', 'triangle')!;

    // Pintbox leader effective cap is 7. At Stress 5 it has headroom 2.
    // Triangle cap is 4. At Stress 1 it has headroom 3 and should take the cost.
    leader.stress = 5;
    viceLeader.stress = 1;
    expect(engine.skills.getCoordinationStressBearer('player')).toBe('triangle');

    // Equal or lower vice-leader headroom leaves the cost on the leader.
    viceLeader.stress = 2;
    expect(engine.skills.getCoordinationStressBearer('player')).toBe('pintbox');

    viceLeader.stress = 3;
    expect(engine.skills.getCoordinationStressBearer('player')).toBe('pintbox');
  });""",
)

replace_once(
    'src/tests/skills.test.ts',
    """  it('副組長力 makes 流星 take coordination-card stress when below the leader', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, METEOR_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    engine.getCharacter('player', 'pintbox')!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(2);
  });""",
    """  it('副組長力 makes 流星 take coordination-card stress when it has more headroom than the leader', () => {
    const game = createInitialGame(fixedRng(0.5), STANDARD_GAME_DEFINITION, METEOR_ROSTER);
    const engine = new EngineSession(game, fixedRng(0.5));
    // Pintbox leader: effective cap 7, Stress 4 => headroom 3.
    // Meteor: cap 4, Stress 0 => headroom 4.
    engine.getCharacter('player', 'pintbox')!.stress = 4;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'pintbox')?.stress).toBe(4);
  });""",
)

replace_once(
    'src/tests/leader-succession.test.ts',
    """  it('keeps the leader as card actor when viceLeaderPower redirects coordination Stress', () => {
    const definition = withLeaderCardAudit('pintbox');
    const roster = {
      playerMemberIds: ['pintbox', 'meteor', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    };
    const game = createGame(definition, roster);
    const engine = new EngineSession(game, () => 0.5, definition);
    const leader = engine.getCharacter('player', 'pintbox')!;
    const viceLeader = engine.getCharacter('player', 'meteor')!;
    leader.stress = 2;
    viceLeader.stress = 0;
    engine.getCharacter('player', 'mashiro')!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(viceLeader.stress).toBe(1);
    expect(leader.stress).toBe(1);
    expect(game.player.leaderId).toBe('pintbox');
  });""",
    """  it('keeps the leader as card actor when headroom-based viceLeaderPower redirects coordination Stress', () => {
    const definition = withLeaderCardAudit('pintbox');
    const roster = {
      playerMemberIds: ['pintbox', 'meteor', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
    };
    const game = createGame(definition, roster);
    const engine = new EngineSession(game, () => 0.5, definition);
    const leader = engine.getCharacter('player', 'pintbox')!;
    const viceLeader = engine.getCharacter('player', 'meteor')!;
    leader.stress = 4;
    viceLeader.stress = 0;
    engine.getCharacter('player', 'mashiro')!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(viceLeader.stress).toBe(1);
    // Coordination cost is redirected, but cardPlayed still reports Pintbox as actor,
    // so the audit skill reduces Pintbox Stress 4 -> 3.
    expect(leader.stress).toBe(3);
    expect(game.player.leaderId).toBe('pintbox');
  });""",
)

replace_once(
    'src/tests/skill-runtime-regressions.test.ts',
    """  it('情緒 屬陀螺的 observes the actual coordination-card target and only triggers once per round', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'emotion'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    leader.stress = 1;
    engine.addCard('player', 'guide', 2);
    const cards = game.player.hand.filter((card) => card.cardId === 'guide');

    expect(engine.playCard('player', cards[0]!.instanceId, { memberId: 'emotion', skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(1);
    expect(engine.playCard('player', cards[1]!.instanceId, { memberId: 'emotion', skill: 'text' })).toBe(true);
    expect(leader.stress).toBe(2);
  });""",
    """  it('情緒 屬陀螺的 observes 指導 target while 指導 skips the normal coordination fee', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'emotion'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    leader.stress = 1;
    engine.addCard('player', 'guide', 2);
    const cards = game.player.hand.filter((card) => card.cardId === 'guide');

    expect(engine.playCard('player', cards[0]!.instanceId, { memberId: 'emotion', skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(0);
    expect(engine.playCard('player', cards[1]!.instanceId, { memberId: 'emotion', skill: 'text' })).toBe(true);
    expect(leader.stress).toBe(0);
  });""",
)

replace_once(
    'src/tests/skill-runtime-regressions.test.ts',
    """  it('Enki 副組長力 is resolved before coordination Stress and never reacts to the opponent card event', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'enki'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    const enki = engine.getCharacter('player', 'enki')!;
    leader.stress = 2;
    enki.stress = 2;
    engine.addCard('player', 'guide', 1);
    const playerCard = game.player.hand.find((card) => card.cardId === 'guide')!;

    expect(engine.playCard('player', playerCard.instanceId, { memberId: SKILL_FIXTURES.playerB, skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(2);
    expect(enki.stress).toBe(3);

    engine.addCard('enemy', 'guide', 1);
    const enemyCard = game.enemy.hand.find((card) => card.cardId === 'guide')!;
    expect(engine.playCard('enemy', enemyCard.instanceId, { memberId: SKILL_FIXTURES.enemyB, skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(2);
    expect(enki.stress).toBe(3);
  });""",
    """  it('Enki 副組長力 uses headroom for normal coordination cost but does not intercept 指導 target Stress', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'enki'] });
    const leader = engine.getCharacter('player', SKILL_FIXTURES.playerA)!;
    const enki = engine.getCharacter('player', 'enki')!;
    const target = engine.getCharacter('player', SKILL_FIXTURES.playerB)!;
    leader.stress = 4;
    enki.stress = 2;

    engine.addCard('player', 'guide', 1);
    const guide = game.player.hand.find((card) => card.cardId === 'guide')!;
    expect(engine.playCard('player', guide.instanceId, { memberId: SKILL_FIXTURES.playerB, skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(4);
    expect(enki.stress).toBe(2);
    expect(target.stress).toBe(1);

    engine.addCard('player', 'soothe', 1);
    const soothe = game.player.hand.find((card) => card.cardId === 'soothe')!;
    expect(engine.playCard('player', soothe.instanceId, { memberId: SKILL_FIXTURES.playerB })).toBe(true);
    expect(leader.stress).toBe(4);
    expect(enki.stress).toBe(3);

    engine.addCard('enemy', 'guide', 1);
    const enemyCard = game.enemy.hand.find((card) => card.cardId === 'guide')!;
    expect(engine.playCard('enemy', enemyCard.instanceId, { memberId: SKILL_FIXTURES.enemyB, skill: 'design' })).toBe(true);
    expect(leader.stress).toBe(4);
    expect(enki.stress).toBe(3);
  });""",
)

replace_once(
    'src/tests/skill-runtime-regressions.test.ts',
    """  it('multiple vice leaders choose exactly one coordination Stress bearer', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'meteor', 'enki'] });
    engine.getCharacter('player', SKILL_FIXTURES.playerA)!.stress = 2;
    engine.addCard('player', 'guide', 1);
    const card = game.player.hand.find((item) => item.cardId === 'guide')!;

    expect(engine.playCard('player', card.instanceId, { memberId: SKILL_FIXTURES.playerA, skill: 'design' })).toBe(true);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'enki')?.stress).toBe(0);
    expect(engine.getCharacter('player', SKILL_FIXTURES.playerA)?.stress).toBe(2);
  });""",
    """  it('multiple vice leaders choose exactly one normal coordination Stress bearer', () => {
    const { game, engine } = createSkillHarness({ player: [SKILL_FIXTURES.playerA, 'meteor', 'enki'] });
    engine.getCharacter('player', SKILL_FIXTURES.playerA)!.stress = 2;
    engine.addCard('player', 'soothe', 1);
    const card = game.player.hand.find((item) => item.cardId === 'soothe')!;

    expect(engine.playCard('player', card.instanceId, { memberId: SKILL_FIXTURES.playerA })).toBe(true);
    expect(engine.getCharacter('player', 'meteor')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'enki')?.stress).toBe(0);
    expect(engine.getCharacter('player', SKILL_FIXTURES.playerA)?.stress).toBe(0);
  });""",
)

print('P0 legacy assertions updated successfully.')
