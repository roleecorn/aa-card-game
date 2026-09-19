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


# Generic active condition: selected work still has an empty progress cell for a skill.
rep(
    'src/game/schema.ts',
    "  | { kind: 'workHasProgress'; target: z.infer<typeof workSelectorSchema>; skill?: 'design' | 'text' | 'aa'; quantifier?: 'any' | 'all' }\n  | { kind: 'chance'; probability: number };",
    "  | { kind: 'workHasProgress'; target: z.infer<typeof workSelectorSchema>; skill?: 'design' | 'text' | 'aa'; quantifier?: 'any' | 'all' }\n  | { kind: 'workHasEmptyProgress'; target: z.infer<typeof workSelectorSchema>; skill?: 'design' | 'text' | 'aa'; quantifier?: 'any' | 'all' }\n  | { kind: 'chance'; probability: number };",
)
rep(
    'src/game/schema.ts',
    "    z.object({\n      kind: z.literal('workHasProgress'),\n      target: workSelectorSchema,\n      skill: skillStatSchema.optional(),\n      quantifier: z.enum(['any', 'all']).optional(),\n    }),\n    z.object({\n      kind: z.literal('chance'),",
    "    z.object({\n      kind: z.literal('workHasProgress'),\n      target: workSelectorSchema,\n      skill: skillStatSchema.optional(),\n      quantifier: z.enum(['any', 'all']).optional(),\n    }),\n    z.object({\n      kind: z.literal('workHasEmptyProgress'),\n      target: workSelectorSchema,\n      skill: skillStatSchema.optional(),\n      quantifier: z.enum(['any', 'all']).optional(),\n    }),\n    z.object({\n      kind: z.literal('chance'),",
)
rep(
    'src/game/skillRuntime.ts',
    "  if (condition.kind === 'workHasProgress') {\n    const works = engine.resolveWorks(condition.target, context);\n    if (!works.length) return false;\n    const matches = (work: (typeof works)[number]) => workHasProgress(work, condition.skill);\n    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);\n  }\n  if (condition.kind === 'chance') return engine.random() < condition.probability;",
    "  if (condition.kind === 'workHasProgress') {\n    const works = engine.resolveWorks(condition.target, context);\n    if (!works.length) return false;\n    const matches = (work: (typeof works)[number]) => workHasProgress(work, condition.skill);\n    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);\n  }\n  if (condition.kind === 'workHasEmptyProgress') {\n    const works = engine.resolveWorks(condition.target, context);\n    if (!works.length) return false;\n    const matches = (work: (typeof works)[number]) => work.slots.some((slot) =>\n      condition.skill ? slot[condition.skill] === undefined :\n        slot.design === undefined || slot.text === undefined || slot.aa === undefined);\n    return condition.quantifier === 'all' ? works.every(matches) : works.some(matches);\n  }\n  if (condition.kind === 'chance') return engine.random() < condition.probability;",
)

# Generalize the existing two-die active target contract. Mashiro keeps otherAlly -> self;
# Ginsakura uses self -> otherAlly and may legally copy an equal value because consuming
# the source die and reducing Stress are still meaningful effects.
rep(
    'src/game/schema.ts',
    "  z.object({ kind: z.literal('copyPendingDie'), source: z.literal('otherAlly'), target: z.literal('self') }),",
    "  z.object({\n    kind: z.literal('copyPendingDie'),\n    source: z.enum(['self', 'otherAlly']),\n    target: z.enum(['self', 'otherAlly']),\n    requireValueChange: z.boolean().default(true),\n  }),",
)
rep(
    'src/game/skillRuntime.ts',
    "    if (spec.kind === 'copyPendingDie') {\n      if (!target.sourceDieId || !target.targetDieId) return false;\n      const team = this.engine.getTeam(teamId);\n      const source = team.pendingDice.find((die) => die.id === target.sourceDieId);\n      const destination = team.pendingDice.find((die) => die.id === target.targetDieId);\n      return !!source\n        && !!destination\n        && source.ownerId !== memberId\n        && destination.ownerId === memberId\n        && source.value !== destination.value;\n    }",
    "    if (spec.kind === 'copyPendingDie') {\n      if (!target.sourceDieId || !target.targetDieId || target.sourceDieId === target.targetDieId) return false;\n      const team = this.engine.getTeam(teamId);\n      const source = team.pendingDice.find((die) => die.id === target.sourceDieId);\n      const destination = team.pendingDice.find((die) => die.id === target.targetDieId);\n      if (!source || !destination) return false;\n      const sourceMatches = spec.source === 'self' ? source.ownerId === memberId : source.ownerId !== memberId;\n      const targetMatches = spec.target === 'self' ? destination.ownerId === memberId : destination.ownerId !== memberId;\n      return sourceMatches && targetMatches && (!spec.requireValueChange || source.value !== destination.value);\n    }",
)

# Selection-plan candidates follow the generalized source/target relation too.
rep(
    'src/game/targeting.ts',
    "  if (spec.kind === 'copyPendingDie') {\n    const team = engine.getTeam(teamId);\n    if (!partialTarget.sourceDieId) {\n      return {\n        stage: 'sourceDie',\n        candidates: team.pendingDice.map((die): TargetCandidate => {\n          if (die.ownerId === ownerId) return { id: die.id, ...blocked('來源骰必須來自另一名我方角色。') };\n          const destination = team.pendingDice.find((target) =>\n            engine.skills.canActivateSkillTarget(ownerId, skill.id, { sourceDieId: die.id, targetDieId: target.id }));\n          return {\n            id: die.id,\n            ...(destination\n              ? allowed(skillExternalWarning(engine, ownerId, die.ownerId))\n              : blocked('目前沒有合法的自己的骰可作為目標。')),\n          };\n        }),\n      };\n    }\n    return {\n      stage: 'targetDie',\n      candidates: team.pendingDice.map((die): TargetCandidate => ({\n        id: die.id,\n        ...runtimeTargetLegality(engine, ownerId, skill, {\n          sourceDieId: partialTarget.sourceDieId,\n          targetDieId: die.id,\n        }),\n      })),\n    };\n  }",
    "  if (spec.kind === 'copyPendingDie') {\n    const team = engine.getTeam(teamId);\n    const relationMatches = (relation: 'self' | 'otherAlly', die: DieToken) =>\n      relation === 'self' ? die.ownerId === ownerId : die.ownerId !== ownerId;\n    if (!partialTarget.sourceDieId) {\n      return {\n        stage: 'sourceDie',\n        candidates: team.pendingDice.map((die): TargetCandidate => {\n          if (!relationMatches(spec.source, die)) {\n            return { id: die.id, ...blocked(spec.source === 'self' ? '來源骰必須是自己的骰。' : '來源骰必須來自另一名我方角色。') };\n          }\n          const destination = team.pendingDice.find((target) =>\n            engine.skills.canActivateSkillTarget(ownerId, skill.id, { sourceDieId: die.id, targetDieId: target.id }));\n          return { id: die.id, ...(destination ? allowed() : blocked('目前沒有合法的目標骰。')) };\n        }),\n      };\n    }\n    return {\n      stage: 'targetDie',\n      candidates: team.pendingDice.map((die): TargetCandidate => {\n        if (!relationMatches(spec.target, die)) {\n          return { id: die.id, ...blocked(spec.target === 'self' ? '目標骰必須是自己的骰。' : '目標骰必須來自另一名我方角色。') };\n        }\n        return {\n          id: die.id,\n          ...runtimeTargetLegality(\n            engine,\n            ownerId,\n            skill,\n            { sourceDieId: partialTarget.sourceDieId, targetDieId: die.id },\n            skillExternalWarning(engine, ownerId, die.ownerId),\n          ),\n        };\n      }),\n    };\n  }",
)

# UI derives both dice lists from the active-target spec instead of assuming Mashiro's direction.
rep(
    'src/components/SkillActivationDialog.tsx',
    "  const sourceDice = useMemo(() => {\n    const candidates = game.player.pendingDice.filter((die) => memberId && die.ownerId !== memberId);\n    if (mode === 'tutorial' && skillId === 'mashiroSynthesis') {\n      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.mashiroSynthesis.sourceDie);\n    }\n    return candidates;\n  }, [game, memberId, mode, skillId]);\n\n  const copyTargetDice = useMemo(() => {\n    const candidates = game.player.pendingDice.filter((die) => die.ownerId === memberId);\n    if (mode === 'tutorial' && skillId === 'mashiroSynthesis') {\n      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.mashiroSynthesis.targetDie);\n    }\n    return candidates;\n  }, [game, memberId, mode, skillId]);",
    "  const sourceDice = useMemo(() => {\n    if (!memberId || spec.kind !== 'copyPendingDie') return [];\n    const candidates = game.player.pendingDice.filter((die) =>\n      spec.source === 'self' ? die.ownerId === memberId : die.ownerId !== memberId);\n    if (mode === 'tutorial' && skillId === 'mashiroSynthesis') {\n      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.mashiroSynthesis.sourceDie);\n    }\n    return candidates;\n  }, [game, memberId, mode, skillId, spec]);\n\n  const copyTargetDice = useMemo(() => {\n    if (!memberId || spec.kind !== 'copyPendingDie') return [];\n    const candidates = game.player.pendingDice.filter((die) =>\n      spec.target === 'self' ? die.ownerId === memberId : die.ownerId !== memberId);\n    if (mode === 'tutorial' && skillId === 'mashiroSynthesis') {\n      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.mashiroSynthesis.targetDie);\n    }\n    return candidates;\n  }, [game, memberId, mode, skillId, spec]);",
)

# Character-specific resolution where the generic effect vocabulary does not express the atomic operation.
rep(
    'src/game/characterSkillEffects.ts',
    "import type { DieToken } from './types';",
    "import type { DieToken } from './types';\nimport { isExternalEffectBlocked } from './externalImmunity';",
)
rep(
    'src/game/characterSkillEffects.ts',
    "registerCustomSkillEffect('fengyangWakeUp', (_effect, context, engine) => {",
    "registerCustomSkillEffect('narratorAlligator', (_effect, context, engine) => {\n  const workId = context.activationTarget?.workId;\n  if (!workId) return false;\n  const work = engine.getTeam(context.ownerTeamId).works.find((candidate) => candidate.id === workId);\n  if (!work) return false;\n  if (isExternalEffectBlocked(engine, context, work.ownerId)) return true;\n  const slotIndex = work.slots.findIndex((slot) => slot.design === undefined);\n  const slot = work.slots[slotIndex];\n  if (!slot) return false;\n  const value = engine.rollDieFor(context.ownerId);\n  if (value === undefined) return false;\n  slot.design = value;\n  work.type = '笑';\n  work.extraTypes = [];\n  engine.skills.emit({\n    type: 'afterDiePlaced', teamId: context.ownerTeamId, actorId: context.ownerId,\n    skill: 'design', workId: work.id, amount: value, metadata: { slotIndex, reason: context.definition.id },\n  });\n  return true;\n});\n\nregisterCustomSkillEffect('ginsakuraSupport', (_effect, context, engine) => {\n  const sourceId = context.activationTarget?.sourceDieId;\n  const targetId = context.activationTarget?.targetDieId;\n  if (!sourceId || !targetId || sourceId === targetId) return false;\n  const team = engine.getTeam(context.ownerTeamId);\n  const source = team.pendingDice.find((die) => die.id === sourceId);\n  const target = team.pendingDice.find((die) => die.id === targetId);\n  if (!source || !target || source.ownerId !== context.ownerId || target.ownerId === context.ownerId) return false;\n  if (isExternalEffectBlocked(engine, context, target.ownerId)) return true;\n\n  const event = engine.skills.emit({\n    type: 'beforeDieModified', teamId: context.ownerTeamId, actorId: context.ownerId,\n    targetId: target.ownerId, sourceId: source.ownerId, dieId: target.id, skill: target.skill,\n    metadata: { reason: context.definition.id },\n  });\n  if (event.cancelled) return false;\n  target.value = source.value;\n  engine.skills.emit({ ...event, type: 'afterDieModified' });\n  team.pendingDice = team.pendingDice.filter((die) => die.id !== source.id);\n  engine.adjustStress(context.ownerTeamId, context.ownerId, -1, context.definition.name);\n  return true;\n});\n\nregisterCustomSkillEffect('fengyangWakeUp', (_effect, context, engine) => {",
)
rep(
    'src/game/characterSkillEffects.ts',
    "    engine.log(`${context.definition.name}：風揚就是組長，-1 與 +1 Stress 互相抵消。`);",
    "    engine.log(`${context.definition.name}：${engine.getDefinition(context.ownerId).name} 就是組長，-1 與 +1 Stress 互相抵消。`);",
)

# Narrator final specification.
write('src/content/narrator.ts', """import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const narratorCharacter = characterDefinitionSchema.parse({
  id: 'narrator',
  name: '旁白',
  stats: { design: 1, text: 3, aa: 1 },
  maxStress: 5,
  affinities: ['情', '燃', '笑', '怪'],
  skillIds: ['narratorLongForm', 'narratorOsaka'],
  portrait: 'assets/characters/portrait/narrator.webp',
  compactPortrait: 'assets/characters/compact/narrator.webp',
  sourceNotes: [
    '2026-09-14 final：Design 1 / Text 3 / AA 1；適性（情 / 燃 / 笑 / 怪）。',
    '此次未重述 Stress 上限，因此保留既有 5。',
    '「超長段子手」每回合一次：2 顆 Text、自己作品篇幅 +1、自身 Stress -1。',
    '「大鱷魚的召喚」每回合一次：指定我方作品加入 1d6 Design，作品類型 replace 成（笑）。',
  ],
});

export const narratorSkills = skillDefinitionSchema.array().parse([
  {
    id: 'narratorLongForm',
    name: '超長段子手',
    description: '每回合一次：獲得 2 顆 Text 骰，自己的作品篇幅 +1，自身 Stress -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [
      { kind: 'dice.grant', target: 'owner', skill: 'text', count: 2, origin: '超長段子手', extra: true },
      { kind: 'work.length', target: 'ownerWork', amount: 1 },
      { kind: 'stress.change', target: 'owner', amount: -1, source: '超長段子手' },
    ],
  },
  {
    id: 'narratorOsaka',
    name: '大鱷魚的召喚',
    description: '每回合一次：指定一部我方作品，加入 1d6 Design 骰，並將作品類型改為（笑）。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'work', relation: 'ally' },
    activeCondition: { kind: 'workHasEmptyProgress', target: 'selectedWork', skill: 'design' },
    activeEffects: [{ kind: 'custom', handler: 'narratorAlligator' }],
  },
]);
""")

# Ginsakura final specification.
write('src/content/ginsakura.ts', """import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const ginsakuraCharacter = characterDefinitionSchema.parse({
  id: 'ginsakura',
  name: '銀櫻',
  stats: { design: 1, text: 2, aa: 3 },
  maxStress: 3,
  affinities: ['燃'],
  skillIds: ['ginsakuraRise', 'ginsakuraSupport'],
  portrait: 'assets/characters/portrait/ginsakura.webp',
  compactPortrait: 'assets/characters/compact/ginsakura.webp',
  sourceNotes: [
    '2026-09-14 final：Design 1 / Text 2 / AA 3，適性（燃）；既有 Stress 上限 3 維持。',
    '「起來」：回合開始且自身 Stress >= effective maxStress 時，自身 -1、組長 +1。',
    '「愉悅的支援者」：每回合一次，消耗自己一顆 pending die，把另一名組員一顆 pending die 改為同點數，自身 Stress -1。',
  ],
});

export const ginsakuraSkills = skillDefinitionSchema.array().parse([
  {
    id: 'ginsakuraRise',
    name: '起來',
    description: '回合開始時，若自身 Stress >= 壓力上限：自身 Stress -1、組長 Stress +1；自己就是組長時兩者抵消。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{ event: 'roundStart', effects: [{ kind: 'custom', handler: 'fengyangWakeUp' }] }],
  },
  {
    id: 'ginsakuraSupport',
    name: '愉悅的支援者',
    description: '每回合一次：消耗自己 1 顆 pending die，選另一名組員 1 顆 pending die，將其改為被消耗骰的點數，自身 Stress -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'copyPendingDie', source: 'self', target: 'otherAlly', requireValueChange: false },
    activeEffects: [{ kind: 'custom', handler: 'ginsakuraSupport' }],
  },
]);
""")

# P2C acceptance coverage.
write('src/tests/discussion-p2c-narrator-ginsakura.test.ts', """import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { getSkillSelectionPlan } from '../game/targeting';

function createCase(ids: string[], rng: () => number = () => 0.999) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
    playerMemberIds: ids,
    enemyMemberIds: ['pintbox', 'bluewind', 'lemon'],
  });
  return { game, engine: new EngineSession(game, rng, STANDARD_GAME_DEFINITION) };
}

describe('2026-09-19 P2C Narrator and Ginsakura', () => {
  it('旁白 uses the four final affinities and keeps the existing Stress cap', () => {
    expect(CHARACTERS.narrator?.stats).toEqual({ design: 1, text: 3, aa: 1 });
    expect(CHARACTERS.narrator?.maxStress).toBe(5);
    expect(CHARACTERS.narrator?.affinities).toEqual(['情', '燃', '笑', '怪']);
    expect(SKILLS.narratorLongForm?.status).toBe('implemented');
    expect(SKILLS.narratorOsaka?.status).toBe('implemented');
  });

  it('超長段子手 grants two Text dice, lengthens the owner work, and lowers Stress once per round', () => {
    const { game, engine } = createCase(['narrator', 'mashiro', 'user79']);
    const narrator = engine.getCharacter('player', 'narrator')!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'narrator')!;
    const beforeLength = work.length;
    narrator.stress = 2;
    const beforeDice = game.player.pendingDice.length;

    expect(engine.activateSkill('player', 'narrator', 'narratorLongForm')).toBe(true);
    expect(game.player.pendingDice.slice(beforeDice)).toHaveLength(2);
    expect(game.player.pendingDice.slice(beforeDice).every((die) => die.ownerId === 'narrator' && die.skill === 'text')).toBe(true);
    expect(work.length).toBe(beforeLength + 1);
    expect(narrator.stress).toBe(1);
    expect(engine.activateSkill('player', 'narrator', 'narratorLongForm')).toBe(false);
  });

  it('大鱷魚的召喚 rolls one Design directly into an allied work and replaces all work types with 笑', () => {
    const { game, engine } = createCase(['narrator', 'mashiro', 'user79']);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    work.type = '怪';
    work.extraTypes = ['燃'];
    work.slots.forEach((slot) => { delete slot.design; });

    expect(engine.canActivateSkillTarget('narrator', 'narratorOsaka', { workId: work.id })).toBe(true);
    expect(engine.activateSkill('player', 'narrator', 'narratorOsaka', { workId: work.id })).toBe(true);
    expect(work.slots[0]!.design).toBe(6);
    expect(work.type).toBe('笑');
    expect(work.extraTypes).toEqual([]);
    expect(engine.activateSkill('player', 'narrator', 'narratorOsaka', { workId: work.id })).toBe(false);
  });

  it('大鱷魚的召喚 does not expose a work whose Design column has no empty slot', () => {
    const { game, engine } = createCase(['narrator', 'mashiro', 'user79']);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    work.slots.forEach((slot) => { slot.design = 3; });
    expect(engine.canActivateSkillTarget('narrator', 'narratorOsaka', { workId: work.id })).toBe(false);
  });

  it('銀櫻 起來 transfers one Stress to the leader when she starts the round at her effective cap', () => {
    const { engine } = createCase(['mashiro', 'ginsakura', 'user79']);
    const silver = engine.getCharacter('player', 'ginsakura')!;
    const leader = engine.getCharacter('player', 'mashiro')!;
    silver.stress = engine.getEffectiveMaxStress('player', 'ginsakura')!;
    leader.stress = 0;
    engine.skills.emit({ type: 'roundStart' });
    expect(silver.stress).toBe(2);
    expect(leader.stress).toBe(1);
  });

  it('愉悅的支援者 consumes a self die, copies its value to another ally, lowers Stress, and is once per round', () => {
    const { game, engine } = createCase(['mashiro', 'ginsakura', 'user79']);
    const silver = engine.getCharacter('player', 'ginsakura')!;
    silver.stress = 2;
    game.player.pendingDice = [];
    const source = engine.grantDice('player', 'ginsakura', 'aa', 1, 'setup', false, 5)[0]!;
    const target = engine.grantDice('player', 'mashiro', 'text', 1, 'setup', false, 2)[0]!;
    source.value = 5;
    target.value = 2;

    const sourcePlan = getSkillSelectionPlan(engine, 'ginsakura', 'ginsakuraSupport');
    expect(sourcePlan.stage).toBe('sourceDie');
    expect(sourcePlan.candidates.find((candidate) => candidate.id === source.id)?.allowed).toBe(true);
    expect(sourcePlan.candidates.find((candidate) => candidate.id === target.id)?.allowed).toBe(false);
    const targetPlan = getSkillSelectionPlan(engine, 'ginsakura', 'ginsakuraSupport', { sourceDieId: source.id });
    expect(targetPlan.candidates.find((candidate) => candidate.id === target.id)?.allowed).toBe(true);

    expect(engine.activateSkill('player', 'ginsakura', 'ginsakuraSupport', { sourceDieId: source.id, targetDieId: target.id })).toBe(true);
    expect(target.value).toBe(5);
    expect(game.player.pendingDice.some((die) => die.id === source.id)).toBe(false);
    expect(silver.stress).toBe(1);
    expect(engine.activateSkill('player', 'ginsakura', 'ginsakuraSupport', { sourceDieId: target.id, targetDieId: target.id })).toBe(false);
  });

  it('Mashiro keeps the original otherAlly -> self copy-die contract', () => {
    const { game, engine } = createCase(['mashiro', 'ginsakura', 'user79']);
    game.player.pendingDice = [];
    const source = engine.grantDice('player', 'ginsakura', 'text', 1, 'setup', false, 6)[0]!;
    const target = engine.grantDice('player', 'mashiro', 'aa', 1, 'setup', false, 1)[0]!;
    source.value = 6;
    target.value = 1;
    expect(engine.canActivateSkillTarget('mashiro', 'mashiroSynthesis', { sourceDieId: source.id, targetDieId: target.id })).toBe(true);
    expect(engine.canActivateSkillTarget('mashiro', 'mashiroSynthesis', { sourceDieId: target.id, targetDieId: source.id })).toBe(false);
  });
});
""")

print('P2C Narrator/Ginsakura patch applied successfully.')
