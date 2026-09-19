from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def rep(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f'expected snippet not found in {path}: {old[:140]!r}')
    write(path, text.replace(old, new, count))


# Schema/runtime primitives used by the new card pool.
rep(
    'src/game/schema.ts',
    "    external: z.boolean().optional(),\n    source: z.string().optional(),",
    "    external: z.boolean().optional(),\n    allowNegative: z.boolean().optional(),\n    source: z.string().optional(),",
)
rep(
    'src/game/schema.ts',
    "    z.object({ kind: z.literal('voiceMode') }),\n  ]),",
    "    z.object({ kind: z.literal('voiceMode') }),\n    z.object({ kind: z.literal('polishMode') }),\n  ]),",
)
rep(
    'src/game/types.ts',
    "  voiceMode?: 'relief' | 'design' | 'text';",
    "  voiceMode?: 'relief' | 'design' | 'text';\n  polishMode?: 'work' | 'pending';",
)
rep(
    'src/game/statuses.ts',
    "  hidden: 'hidden',",
    "  hidden: 'hidden',\n  textStatZero: 'text-stat-zero',\n  aaStatZero: 'aa-stat-zero',",
)

rep(
    'src/game/engine.ts',
    "    if (!member) return 0;\n    return Math.max(0, member.permanentStats[skill] + member.timedStatModifiers",
    "    if (!member) return 0;\n    if (skill === 'text' && getStatusStacks(member, GAMEPLAY_STATUS.textStatZero) > 0) return 0;\n    if (skill === 'aa' && getStatusStacks(member, GAMEPLAY_STATUS.aaStatZero) > 0) return 0;\n    return Math.max(0, member.permanentStats[skill] + member.timedStatModifiers",
)
rep(
    'src/game/engine.ts',
    "  adjustStress(teamId: TeamId, memberId: string, amount: number, source: string, external = false, sourceId?: string): void {",
    "  adjustStress(teamId: TeamId, memberId: string, amount: number, source: string, external = false, sourceId?: string, allowNegative = false): void {",
)
rep(
    'src/game/engine.ts',
    "    member.stress = Math.max(0, member.stress + actual);",
    "    member.stress = allowNegative ? member.stress + actual : Math.max(0, member.stress + actual);",
)
rep(
    'src/game/effectRegistry.ts',
    "      engine.adjustStress(teamId, member.defId, amount, effect.source ?? context.definition.name, effect.external ?? false, context.ownerId);",
    "      engine.adjustStress(\n        teamId,\n        member.defId,\n        amount,\n        effect.source ?? context.definition.name,\n        effect.external ?? false,\n        context.ownerId,\n        effect.allowNegative ?? false,\n      );",
)

# New polish target mode: either an allied work or the team's pending dice pool.
rep(
    'src/game/engine.ts',
    "    if (card.target.kind === 'none' || card.target.kind === 'voiceMode') return true;\n    if (card.target.kind === 'member') {",
    "    if (card.target.kind === 'none' || card.target.kind === 'voiceMode') return true;\n    if (card.target.kind === 'polishMode') {\n      if (target.polishMode === 'pending') return this.getTeam(teamId).pendingDice.length > 0;\n      if (target.polishMode !== 'work' || !target.workId) return false;\n      const work = this.getTeam(teamId).works.find((candidate) => candidate.id === target.workId);\n      return !!work && work.slots.some((slot) => slot.design !== undefined || slot.text !== undefined || slot.aa !== undefined);\n    }\n    if (card.target.kind === 'member') {",
)

# Soothe is intentionally usable at zero/negative Stress in the new rules.
rep(
    'src/game/targeting.ts',
    "    if (card.id === 'soothe' && member.stress <= 0 && !warning) {\n      return { id: member.defId, ...blocked('此角色目前沒有 Stress 可降低。') };\n    }\n",
    "",
)
rep(
    'src/game/targeting.ts',
    "  if (card.target.kind === 'none' || card.target.kind === 'voiceMode') return allowed();\n  if (card.target.kind === 'member') {",
    "  if (card.target.kind === 'none' || card.target.kind === 'voiceMode') return allowed();\n  if (card.target.kind === 'polishMode') {\n    const hasPending = team.pendingDice.length > 0;\n    const hasWorkProgress = team.works.some(workHasProgress);\n    return hasPending || hasWorkProgress ? allowed() : blocked('目前沒有可供精修重擲的骰子。');\n  }\n  if (card.target.kind === 'member') {",
)

# Card dialog supports the two-mode Polish card and understands round stat-zero statuses for Guide.
rep(
    'src/components/CardPlayDialog.tsx',
    "function effectiveStat(member: CharacterState, stat: SkillStat): number {\n  return Math.max(",
    "function effectiveStat(member: CharacterState, stat: SkillStat): number {\n  if (stat === 'text' && (member.statuses[GAMEPLAY_STATUS.textStatZero]?.stacks ?? 0) > 0) return 0;\n  if (stat === 'aa' && (member.statuses[GAMEPLAY_STATUS.aaStatZero]?.stacks ?? 0) > 0) return 0;\n  return Math.max(",
)
rep(
    'src/components/CardPlayDialog.tsx',
    "  const [voiceMode, setVoiceMode] = useState<'relief' | 'design' | 'text'>('relief');",
    "  const [voiceMode, setVoiceMode] = useState<'relief' | 'design' | 'text'>('relief');\n  const [polishMode, setPolishMode] = useState<'work' | 'pending'>('work');",
)
rep(
    'src/components/CardPlayDialog.tsx',
    "    setVoiceMode('relief');",
    "    setVoiceMode('relief');\n    setPolishMode('work');",
)
rep(
    'src/components/CardPlayDialog.tsx',
    "  const works = useMemo(() => {\n    if (!card || card.target.kind !== 'work') return [];\n    const candidates = card.target.relation === 'ally' ? game.player.works : game.enemy.works;\n    return candidates;\n  }, [card, game]);",
    "  const works = useMemo(() => {\n    if (!card) return [];\n    if (card.target.kind === 'polishMode') {\n      return game.player.works.filter((work) => work.slots.some((slot) =>\n        slot.design !== undefined || slot.text !== undefined || slot.aa !== undefined));\n    }\n    if (card.target.kind !== 'work') return [];\n    return card.target.relation === 'ally' ? game.player.works : game.enemy.works;\n  }, [card, game]);",
)
rep(
    'src/components/CardPlayDialog.tsx',
    "    || (card.target.kind === 'member' && !!memberId && (!card.target.skillPicker || skillOptions.includes(skill)))\n    || (card.target.kind === 'work' && !!workId);",
    "    || (card.target.kind === 'member' && !!memberId && (!card.target.skillPicker || skillOptions.includes(skill)))\n    || (card.target.kind === 'work' && !!workId)\n    || (card.target.kind === 'polishMode' && (polishMode === 'pending' ? game.player.pendingDice.length > 0 : !!workId));",
)
rep(
    'src/components/CardPlayDialog.tsx',
    "    if (card.target.kind === 'voiceMode') target.voiceMode = voiceMode;\n    onConfirm(target);",
    "    if (card.target.kind === 'voiceMode') target.voiceMode = voiceMode;\n    if (card.target.kind === 'polishMode') {\n      target.polishMode = polishMode;\n      if (polishMode === 'work') target.workId = workId;\n    }\n    onConfirm(target);",
)
rep(
    'src/components/CardPlayDialog.tsx',
    "          {card.target.kind === 'work' && (\n            <FormControl fullWidth>",
    "          {card.target.kind === 'polishMode' && (\n            <FormControl fullWidth>\n              <InputLabel>精修模式</InputLabel>\n              <Select value={polishMode} label=\"精修模式\" onChange={(event) => setPolishMode(event.target.value as typeof polishMode)}>\n                <MenuItem value=\"work\" disabled={!works.length}>作品中最低的 3 顆骰</MenuItem>\n                <MenuItem value=\"pending\" disabled={!game.player.pendingDice.length}>待分配區最低的 3 顆骰</MenuItem>\n              </Select>\n            </FormControl>\n          )}\n          {(card.target.kind === 'work' || (card.target.kind === 'polishMode' && polishMode === 'work')) && (\n            <FormControl fullWidth>",
)
rep(
    'src/app/BattleRoom.tsx',
    "    || pendingCard.target.kind === 'voiceMode'\n    || (pendingCard.target.kind === 'member' && !!pendingCard.target.skillPicker)",
    "    || pendingCard.target.kind === 'voiceMode'\n    || pendingCard.target.kind === 'polishMode'\n    || (pendingCard.target.kind === 'member' && !!pendingCard.target.skillPicker)",
)

# Card handlers for cards whose behavior depends on mode/current round.
rep(
    'src/game/cardHandlers.ts',
    "registerCardHandler('guide', (team, _card, target, engine) => {",
    "registerCardHandler('oneOnOne', (team, _card, target, engine) => {\n  const member = team.members.find((item) => item.defId === target.memberId);\n  const skill = target.skill;\n  if (!member || !skill) return false;\n  if (isCardEffectBlocked(engine, member.defId)) return true;\n  engine.grantDice(team.id, member.defId, skill, 3, '一對一討論', true);\n  return true;\n});\n\nregisterCardHandler('guide', (team, _card, target, engine) => {",
)
rep(
    'src/game/cardHandlers.ts',
    "  const die = engine.grantDice(team.id, member.defId, skill, 1, '指導', true)[0];\n  if (!die) return false;\n  engine.adjustStress(team.id, member.defId, 1, '指導', true, team.leaderId);\n  const threshold = 5 + current;\n  if (die.value >= threshold) {",
    "  const die = engine.grantDice(team.id, member.defId, skill, 1, '指導', true)[0];\n  engine.adjustStress(team.id, member.defId, 1, '指導', true, team.leaderId);\n  const threshold = 5 + current;\n  if (die && die.value >= threshold) {",
)
rep(
    'src/game/cardHandlers.ts',
    "registerCardHandler('voice', (team, _card, target, engine) => {",
    "registerCardHandler('polish', (team, _card, target, engine) => {\n  if (target.polishMode === 'pending') {\n    const candidates = [...team.pendingDice].sort((a, b) => a.value - b.value).slice(0, 3);\n    if (!candidates.length) return false;\n    for (const die of candidates) {\n      if (isCardEffectBlocked(engine, die.ownerId)) continue;\n      const rerolled = engine.rollDieFor(die.ownerId);\n      if (rerolled === undefined) {\n        team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);\n      } else {\n        die.value = rerolled;\n      }\n    }\n    return true;\n  }\n\n  if (target.polishMode !== 'work' || !target.workId) return false;\n  const work = team.works.find((candidate) => candidate.id === target.workId);\n  if (!work) return false;\n  const cells = work.slots.flatMap((slot) => (['design', 'text', 'aa'] as const).flatMap((skill) =>\n    slot[skill] === undefined ? [] : [{ slot, skill, value: slot[skill]! }]));\n  cells.sort((a, b) => a.value - b.value);\n  const chosen = cells.slice(0, 3);\n  if (!chosen.length) return false;\n  if (isCardEffectBlocked(engine, work.ownerId)) return true;\n  for (const cell of chosen) {\n    const rerolled = engine.rollDieFor(work.ownerId);\n    if (rerolled === undefined) delete cell.slot[cell.skill];\n    else cell.slot[cell.skill] = rerolled;\n  }\n  return true;\n});\n\nregisterCardHandler('rush', (team, _card, target, engine) => {\n  if (!target.workId) return false;\n  const work = team.works.find((candidate) => candidate.id === target.workId);\n  if (!work) return false;\n  if (isCardEffectBlocked(engine, work.ownerId)) return true;\n  let filled = 0;\n  for (const skill of ['design', 'text', 'aa'] as const) {\n    const empty = work.slots.filter((slot) => slot[skill] === undefined).slice(0, engine.state.round);\n    for (const slot of empty) {\n      slot[skill] = 1;\n      filled += 1;\n    }\n  }\n  return filled > 0;\n});\n\nregisterCardHandler('voice', (team, _card, target, engine) => {",
)

# Replace card catalog with the P1 pool definitions. Reconsider remains addressable for old scenarios but is no longer in Standard deck.
write('src/content/cards.ts', """import { cardDefinitionSchema } from '../game/schema';

const cardArt = (fileName: string) => `${import.meta.env.BASE_URL}assets/cards/${fileName}`;

export const cardList = cardDefinitionSchema.array().parse([
  {
    id: 'soothe',
    name: '安撫',
    kind: 'coordination',
    description: '指定一名己方組員，Stress -3；可以降到負數。統籌卡仍支付通常的壓力費用。',
    art: cardArt('soothe.svg'),
    target: { kind: 'member', relation: 'ally' },
    effects: [{ kind: 'stress.change', target: 'selectedMember', amount: -3, allowNegative: true, source: '安撫' }],
    ai: { autoUse: true, priority: 10, when: 'allyStressAtLeast2' },
  },
  {
    id: 'oneOnOne',
    name: '一對一討論',
    kind: 'coordination',
    description: '指定一名己方組員與一項 Design / Text / AA，為該能力擲 3 顆骰子。',
    target: { kind: 'member', relation: 'ally', skillPicker: true },
    customHandler: 'oneOnOne',
  },
  {
    id: 'guide',
    name: '指導',
    kind: 'coordination',
    description: '指定能力為 0 或 1 的己方組員：擲 1 顆該能力骰並使目標 Stress +1；骰值 >= 5 + 目前能力值時，該能力永久 +1。本卡不支付通常的統籌卡壓力費用。',
    art: cardArt('guide.svg'),
    coordinationStressCost: 0,
    target: { kind: 'member', relation: 'ally', skillPicker: true },
    customHandler: 'guide',
  },
  {
    id: 'voice',
    name: '語音會議',
    kind: 'coordination',
    description: '三選一：全隊 Stress -1；全隊各獲得 1 顆 Design 骰；全隊各獲得 1 顆 Text 骰。',
    art: cardArt('voice.svg'),
    target: { kind: 'voiceMode' },
    customHandler: 'voice',
  },
  {
    id: 'polish',
    name: '精修',
    kind: 'coordination',
    description: '選擇一部我方作品或待分配區，重擲其中點數最低的 3 顆骰。',
    art: cardArt('polish.svg'),
    target: { kind: 'polishMode' },
    customHandler: 'polish',
  },
  {
    id: 'inspiration',
    name: '靈感爆發',
    kind: 'coordination',
    description: '我方全員本回合後續所有骰子不會擲出 1 或 2。',
    target: { kind: 'none' },
    effects: [{ kind: 'roll.forbid', target: 'allAllies', faces: [1, 2], duration: 'round' }],
  },
  {
    id: 'rush',
    name: '趕工',
    kind: 'coordination',
    description: '指定一部我方作品；Design / Text / AA 各自在空格中最多填入「目前回合數」顆值為 1 的骰。',
    art: cardArt('rush.svg'),
    target: { kind: 'work', relation: 'ally' },
    customHandler: 'rush',
  },
  {
    id: 'reconsider',
    name: '重新考慮一下……',
    kind: 'coordination',
    description: '舊版相容卡；已從 Standard deck 移除。指定作品篇幅 -2（最低 1），作品負責人 Stress +1。',
    art: cardArt('reconsider.svg'),
    target: { kind: 'work', relation: 'ally' },
    effects: [
      { kind: 'work.length', target: 'selectedWork', amount: -2, min: 1 },
      { kind: 'stress.change', target: 'selectedWorkOwner', amount: 1, source: '重新考慮一下……' },
    ],
  },
  {
    id: 'overtime',
    name: '突發加班',
    kind: 'event',
    description: '指定一名對手組員，Stress +2。',
    art: cardArt('overtime.svg'),
    target: { kind: 'member', relation: 'enemy' },
    effects: [{ kind: 'stress.change', target: 'selectedMember', amount: 2, source: '突發加班', external: true }],
    ai: { autoUse: true, priority: 20, when: 'enemyLowestHeadroom' },
  },
  {
    id: 'accident',
    name: '突發事故',
    kind: 'event',
    description: '指定一名敵方角色，神隱 1 回合。',
    target: { kind: 'member', relation: 'enemy' },
    effects: [{ kind: 'status.change', target: 'selectedMember', status: 'hidden', stacks: 1, durationRounds: 1, stacking: 'replace' }],
  },
  {
    id: 'writerBlock',
    name: '卡文',
    kind: 'event',
    description: '指定一名敵方角色；其本輪 Text 能力視為 0。',
    art: cardArt('writer-block.svg'),
    target: { kind: 'member', relation: 'enemy' },
    effects: [{ kind: 'status.change', target: 'selectedMember', status: 'text-stat-zero', stacks: 1, durationRounds: 1, stacking: 'replace' }],
  },
  {
    id: 'techFailure',
    name: '技術故障',
    kind: 'event',
    description: '指定一名敵方角色；其本輪 AA 能力視為 0。',
    target: { kind: 'member', relation: 'enemy' },
    effects: [{ kind: 'status.change', target: 'selectedMember', status: 'aa-stat-zero', stacks: 1, durationRounds: 1, stacking: 'replace' }],
  },
  {
    id: 'thoughtBlock',
    name: '思維阻滯',
    kind: 'event',
    description: '指定一名敵方角色；其本回合不會擲出 5 或 6。',
    target: { kind: 'member', relation: 'enemy' },
    effects: [{ kind: 'roll.forbid', target: 'selectedMember', faces: [5, 6], duration: 'round' }],
  },
]);
""")

rep(
    'src/content/match.ts',
    "export const BASE_DECK = [\n  'soothe', 'guide', 'polish', 'reconsider', 'rush', 'voice',\n  'overtime', 'writerBlock', 'soothe', 'guide', 'voice', 'overtime',\n] as const;",
    "export const BASE_DECK = [\n  'soothe', 'soothe',\n  'oneOnOne', 'oneOnOne',\n  'guide', 'guide',\n  'voice', 'polish', 'inspiration', 'rush',\n  'overtime', 'accident', 'writerBlock', 'techFailure', 'thoughtBlock',\n] as const;",
)

# Regression coverage for the P1 acceptance criteria.
write('src/tests/discussion-p1-cards.test.ts', """import { describe, expect, it } from 'vitest';
import { BASE_DECK, CARDS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from '../game/statuses';
import type { ActionChoice } from '../game/types';

const ROSTER = {
  playerMemberIds: ['pintbox', 'mashiro', 'user79'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function createCase(rng: () => number = () => 0.999) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, ROSTER);
  game.player.hand = [];
  game.enemy.hand = [];
  return { game, engine: new EngineSession(game, rng, STANDARD_GAME_DEFINITION) };
}

function addCard(engine: EngineSession, team: 'player' | 'enemy', cardId: string) {
  engine.addCard(team, cardId, 1);
  const card = engine.getTeam(team).hand.find((item) => item.cardId === cardId);
  if (!card) throw new Error(`missing test card ${cardId}`);
  return card;
}

function slackAll(engine: EngineSession, team: 'player' | 'enemy'): Record<string, ActionChoice> {
  return Object.fromEntries(engine.getTeam(team).members.map((member) => [member.defId, 'slack'])) as Record<string, ActionChoice>;
}

describe('2026-09-19 P1 Standard card pool', () => {
  it('uses exactly 15 cards with a 10 coordination / 5 event split and excludes reconsider', () => {
    expect(BASE_DECK).toHaveLength(15);
    expect(BASE_DECK).not.toContain('reconsider');
    expect(BASE_DECK.filter((id) => CARDS[id]?.kind === 'coordination')).toHaveLength(10);
    expect(BASE_DECK.filter((id) => CARDS[id]?.kind === 'event')).toHaveLength(5);
    expect(BASE_DECK.filter((id) => id === 'soothe')).toHaveLength(2);
    expect(BASE_DECK.filter((id) => id === 'oneOnOne')).toHaveLength(2);
    expect(BASE_DECK.filter((id) => id === 'guide')).toHaveLength(2);
    for (const id of ['voice', 'polish', 'inspiration', 'rush', 'overtime', 'accident', 'writerBlock', 'techFailure', 'thoughtBlock']) {
      expect(BASE_DECK.filter((cardId) => cardId === id)).toHaveLength(1);
    }
  });

  it('keeps the existing draw timing at ten cards per player through round five', () => {
    const { game, engine } = createCase(() => 0.42);
    // Restore the opening hand removed by createCase for this timing check.
    engine.drawCards('player', STANDARD_GAME_DEFINITION.rules.initialHandSize);
    expect(game.player.hand).toHaveLength(2);
    while (game.round < game.maxRounds) {
      engine.performPlayerActions(slackAll(engine, 'player'));
      engine.finishPlayerAssignment();
    }
    expect(game.round).toBe(5);
    expect(game.player.hand).toHaveLength(10);
  });

  it('安撫 reduces Stress by three and may cross below zero', () => {
    const { game, engine } = createCase();
    const target = engine.getCharacter('player', 'mashiro')!;
    target.stress = 0;
    const card = addCard(engine, 'player', 'soothe');
    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(target.stress).toBe(-3);
    expect(game.player.discard).toContain('soothe');
  });

  it('一對一討論 rolls three pending dice for the selected stat without changing the permanent stat', () => {
    const { game, engine } = createCase(() => 0.999);
    const member = engine.getCharacter('player', 'mashiro')!;
    const before = member.permanentStats.text;
    const card = addCard(engine, 'player', 'oneOnOne');
    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro', skill: 'text' })).toBe(true);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'mashiro' && die.skill === 'text')).toHaveLength(3);
    expect(member.permanentStats.text).toBe(before);
  });

  it('精修 can reroll the three lowest pending dice', () => {
    const { game, engine } = createCase(() => 0.999);
    const dice = engine.grantDice('player', 'mashiro', 'design', 4, 'setup', false);
    dice.forEach((die, index) => { die.value = engine.asDieValue(index + 1); });
    const card = addCard(engine, 'player', 'polish');
    expect(engine.playCard('player', card.instanceId, { polishMode: 'pending' })).toBe(true);
    const values = game.player.pendingDice.filter((die) => die.ownerId === 'mashiro').map((die) => die.value).sort((a, b) => a - b);
    expect(values).toEqual([4, 6, 6, 6]);
  });

  it('精修 can reroll the three lowest dice already placed in one work', () => {
    const { game, engine } = createCase(() => 0.999);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    work.slots[0]!.design = 1;
    work.slots[0]!.text = 2;
    work.slots[0]!.aa = 3;
    work.slots[1]!.design = 4;
    const card = addCard(engine, 'player', 'polish');
    expect(engine.playCard('player', card.instanceId, { polishMode: 'work', workId: work.id })).toBe(true);
    expect(work.slots[0]).toMatchObject({ design: 6, text: 6, aa: 6 });
    expect(work.slots[1]!.design).toBe(4);
  });

  it('靈感爆發 forbids 1 and 2 for allied rolls for the rest of this round', () => {
    const { engine } = createCase(() => 0);
    const card = addCard(engine, 'player', 'inspiration');
    expect(engine.playCard('player', card.instanceId, {})).toBe(true);
    expect(engine.rollDieFor('mashiro')).toBe(3);
  });

  it('趕工 fills at most current-round slots for each of Design, Text and AA', () => {
    const { game, engine } = createCase();
    game.round = 3;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    const card = addCard(engine, 'player', 'rush');
    expect(engine.playCard('player', card.instanceId, { workId: work.id })).toBe(true);
    for (const skill of ['design', 'text', 'aa'] as const) {
      expect(work.slots.filter((slot) => slot[skill] === 1)).toHaveLength(3);
      expect(work.slots.filter((slot) => slot[skill] === undefined)).toHaveLength(2);
    }
  });

  it('突發加班 adds exactly two Stress', () => {
    const { engine } = createCase();
    const target = engine.getCharacter('enemy', 'ginsakura')!;
    const card = addCard(engine, 'player', 'overtime');
    expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
    expect(target.stress).toBe(2);
  });

  it('突發事故 applies shared hidden/action-block semantics for one round', () => {
    const { engine } = createCase();
    const target = engine.getCharacter('enemy', 'ginsakura')!;
    const card = addCard(engine, 'player', 'accident');
    expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
    expect(hasGameplayStatus(target, GAMEPLAY_STATUS.hidden)).toBe(true);
    expect(hasGameplayStatus(target, GAMEPLAY_STATUS.actionBlocked)).toBe(true);
  });

  it('卡文 and 技術故障 force the selected stat to zero without overwriting permanent stats', () => {
    for (const [cardId, skill] of [['writerBlock', 'text'], ['techFailure', 'aa']] as const) {
      const { engine } = createCase();
      const target = engine.getCharacter('enemy', 'ginsakura')!;
      const before = target.permanentStats[skill];
      const card = addCard(engine, 'player', cardId);
      expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
      expect(engine.getEffectiveStat('ginsakura', skill)).toBe(0);
      expect(target.permanentStats[skill]).toBe(before);
    }
  });

  it('思維阻滯 composes with the common roll constraint and forbids 5/6', () => {
    const { engine } = createCase(() => 0.999);
    const card = addCard(engine, 'player', 'thoughtBlock');
    expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
    expect(engine.rollDieFor('ginsakura')).toBe(4);
  });
});
""")

print('P1 card pool patch applied successfully.')
