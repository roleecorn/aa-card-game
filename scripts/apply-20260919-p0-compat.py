from pathlib import Path
import re


def read(file: str) -> str:
    return Path(file).read_text(encoding='utf-8')


def write(file: str, text: str) -> None:
    Path(file).write_text(text, encoding='utf-8')


def rep(file: str, old: str, new: str, count: int = 1) -> None:
    text = read(file)
    if old not in text:
        raise SystemExit(f'expected snippet not found in {file}: {old[:100]!r}')
    write(file, text.replace(old, new, count))


def regex_rep(file: str, pattern: str, repl: str, count: int = 1) -> None:
    text = read(file)
    next_text, matches = re.subn(pattern, repl, text, count=count, flags=re.S)
    if matches != count:
        raise SystemExit(f'expected {count} regex match(es) in {file}, got {matches}: {pattern[:100]!r}')
    write(file, next_text)


# Keep old fixtures / serialized snapshots source-compatible while new games initialize these fields.
rep('src/game/types.ts', '  timedRollConstraints: TimedRollConstraint[];', '  timedRollConstraints?: TimedRollConstraint[];')
rep('src/game/types.ts', '  extraTypes: WorkType[];', '  extraTypes?: WorkType[];')
rep('src/game/engine.ts', '    return [...new Set([work.type, ...work.extraTypes])];', '    return [...new Set([work.type, ...(work.extraTypes ?? [])])];')
rep(
    'src/game/engine.ts',
    '        member.timedRollConstraints = member.timedRollConstraints.filter((constraint) => constraint.expiresAfterRound > this.state.round);',
    '        member.timedRollConstraints = (member.timedRollConstraints ?? []).filter((constraint) => constraint.expiresAfterRound > this.state.round);',
)
rep(
    'src/game/effectRegistry.ts',
    '      if (!engine.workHasType(work, effect.workType)) work.extraTypes.push(effect.workType);',
    "      if (!engine.workHasType(work, effect.workType)) {\n        work.extraTypes ??= [];\n        work.extraTypes.push(effect.workType);\n      }",
)
rep(
    'src/tests/discussion-p0-rules.test.ts',
    "    member.timedRollConstraints.push({ id: 'partial', forbiddenFaces: [1, 2, 5, 6], expiresAfterRound: 1 });",
    "    (member.timedRollConstraints ??= []).push({ id: 'partial', forbiddenFaces: [1, 2, 5, 6], expiresAfterRound: 1 });",
)
rep(
    'src/tests/discussion-p0-rules.test.ts',
    "    member.timedRollConstraints.push({ id: 'rest', forbiddenFaces: [3, 4], expiresAfterRound: 1 });",
    "    member.timedRollConstraints!.push({ id: 'rest', forbiddenFaces: [3, 4], expiresAfterRound: 1 });",
)

# Remove 色 from live UI/test vocabulary.
rep('src/components/WorkCard.tsx', "import PaletteIcon from '@mui/icons-material/Palette';\n", '')
rep('src/components/WorkCard.tsx', '  色: <PaletteIcon fontSize="small" />,\n', '')
rep(
    'src/tests/helpers/skillHarness.ts',
    "const ALL_AFFINITIES = ['燃', '謀', '笑', '情', '色', '怪'] as const;",
    "const ALL_AFFINITIES = ['燃', '謀', '笑', '情', '怪'] as const;",
)

# Existing Pintbox review rerolls: no-legal-face now removes the die rather than manufacturing a value.
regex_rep(
    'src/game/characterSkillEffects.ts',
    r"function rerollLowDie\(die: DieToken, engine: EngineSession, sourceId: string, sourceName: string\): void \{.*?\n\}",
    """function rerollLowDie(die: DieToken, engine: EngineSession, sourceId: string, sourceName: string): boolean {
  const before = die.value;
  const rerolled = engine.rollDieFor(die.ownerId);
  const teamId = engine.findMemberTeam(die.ownerId);
  if (teamId) {
    engine.adjustStress(
      teamId,
      die.ownerId,
      1,
      sourceName,
      die.ownerId !== sourceId,
      sourceId,
    );
  }
  if (rerolled === undefined) {
    if (teamId) {
      const team = engine.getTeam(teamId);
      team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
    }
    engine.log(`${sourceName}：${engine.getDefinition(die.ownerId).name} 的骰子因沒有合法骰面而消失。`);
    return false;
  }
  die.value = rerolled;
  engine.log(`${sourceName}：${engine.getDefinition(die.ownerId).name} 重擲 ${before} → ${die.value}。`);
  return true;
}""",
)
rep(
    'src/game/characterSkillEffects.ts',
    "      rerollLowDie(die, engine, context.ownerId, context.definition.name);\n      rerolls += 1;\n      continue;",
    "      const survived = rerollLowDie(die, engine, context.ownerId, context.definition.name);\n      rerolls += 1;\n      if (!survived && context.event.dice) {\n        context.event.dice.splice(0, context.event.dice.length, ...context.event.dice.filter((candidate) => candidate.id !== die.id));\n      }\n      continue;",
)
rep(
    'src/game/characterSkillEffects.ts',
    "    while (die.value <= 2 && attempts < 20) {\n      rerollLowDie(die, engine, context.ownerId, context.definition.name);\n      rerolls += 1;\n      attempts += 1;\n    }",
    "    let survived = true;\n    while (die.value <= 2 && attempts < 20) {\n      survived = rerollLowDie(die, engine, context.ownerId, context.definition.name);\n      rerolls += 1;\n      attempts += 1;\n      if (!survived) {\n        if (context.event.dice) {\n          context.event.dice.splice(0, context.event.dice.length, ...context.event.dice.filter((candidate) => candidate.id !== die.id));\n        }\n        break;\n      }\n    }\n    if (!survived) continue;",
)

# Direct roll callers in custom effects must handle disappearance.
rep(
    'src/game/customEffects.ts',
    '    const rolled = Array.from({ length: count }, () => engine.rollDieFor(context.ownerId));',
    "    const rolled = Array.from({ length: count }, () => engine.rollDieFor(context.ownerId))\n      .filter((value): value is NonNullable<typeof value> => value !== undefined);",
)
regex_rep(
    'src/game/customEffects.ts',
    r"  const die = \{\n    id: engine\.uid\('die'\),\n    ownerId: context\.ownerId,\n    skill: 'design' as const,\n    value: engine\.rollDieFor\(context\.ownerId\),\n    round: engine\.state\.round,\n    origin: context\.definition\.name,\n  \};\n  team\.pendingDice\.push\(die\);",
    """  const value = engine.rollDieFor(context.ownerId);
  if (value === undefined) return false;
  const die: DieToken = {
    id: engine.uid('die'),
    ownerId: context.ownerId,
    skill: 'design',
    value,
    round: engine.state.round,
    origin: context.definition.name,
  };
  team.pendingDice.push(die);""",
)

regex_rep(
    'src/game/customEffects.ts',
    r"registerCustomSkillEffect\('normalizeForbiddenEventDice', \(effect, context, engine\) => \{.*?\n\}\);\n\nregisterCustomSkillEffect\('rerollOwnerLowestPending'",
    """registerCustomSkillEffect('normalizeForbiddenEventDice', (effect, context, engine) => {
  const dice = context.event.dice;
  const rawValues = effect.args?.values;
  const rawSkills = effect.args?.skills;
  if (!dice?.length || !Array.isArray(rawValues)) return false;
  const localForbidden = new Set(rawValues.filter((value): value is number => typeof value === 'number'));
  const restrictedSkills = Array.isArray(rawSkills)
    ? new Set(rawSkills.filter((skill): skill is SkillStat => SKILLS.includes(skill as SkillStat)))
    : undefined;
  let changed = false;

  for (const die of [...dice]) {
    if (restrictedSkills && !restrictedSkills.has(die.skill)) continue;
    if (!localForbidden.has(die.value)) continue;
    const original = die.value;
    const globalForbidden = engine.skills.getForbiddenRollFaces(die.ownerId);
    const allowed = ([1, 2, 3, 4, 5, 6] as const)
      .filter((value) => !localForbidden.has(value) && !globalForbidden.has(value));
    if (!allowed.length) {
      dice.splice(0, dice.length, ...dice.filter((candidate) => candidate.id !== die.id));
      for (const teamId of ['player', 'enemy'] as const) {
        const team = engine.getTeam(teamId);
        team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);
      }
      engine.log(`${context.definition.name}：骰子因沒有任何合法骰面而消失。`);
      changed = true;
      continue;
    }

    let next = engine.rollDieFor(die.ownerId);
    let attempts = 1;
    while (next !== undefined && localForbidden.has(next) && attempts < 20) {
      next = engine.rollDieFor(die.ownerId);
      attempts += 1;
    }
    if (next === undefined) {
      dice.splice(0, dice.length, ...dice.filter((candidate) => candidate.id !== die.id));
      changed = true;
      continue;
    }
    if (localForbidden.has(next)) {
      next = allowed.sort((a, b) => Math.abs(a - original) - Math.abs(b - original))[0]!;
    }
    die.value = engine.asDieValue(next);
    changed = true;
  }
  return changed;
});

registerCustomSkillEffect('rerollOwnerLowestPending'""",
)

rep(
    'src/game/customEffects.ts',
    '  for (const die of dice) die.value = engine.rollDieFor(context.ownerId);',
    "  const team = engine.getTeam(context.ownerTeamId);\n  for (const die of dice) {\n    const rerolled = engine.rollDieFor(context.ownerId);\n    if (rerolled === undefined) {\n      team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);\n      continue;\n    }\n    die.value = rerolled;\n  }",
)
rep(
    'src/game/customEffects.ts',
    "  die.value = engine.rollDieFor(context.ownerId);\n  return true;\n});\n\nregisterCustomSkillEffect('rerollOwnerWorkProgress'",
    "  const rerolled = engine.rollDieFor(context.ownerId);\n  if (rerolled === undefined) {\n    const team = engine.getTeam(context.ownerTeamId);\n    team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);\n    return true;\n  }\n  die.value = rerolled;\n  return true;\n});\n\nregisterCustomSkillEffect('rerollOwnerWorkProgress'",
)

print('P0 compatibility patch applied successfully.')
