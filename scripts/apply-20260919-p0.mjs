import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content, 'utf8');
}

function replaceOne(file, from, to) {
  const content = read(file);
  if (!content.includes(from)) {
    throw new Error(`Expected snippet not found in ${file}: ${from.slice(0, 120)}`);
  }
  write(file, content.replace(from, to));
}

function appendOnce(file, marker, block) {
  const content = read(file);
  if (content.includes(marker)) return;
  write(file, `${content.trimEnd()}\n\n${block.trim()}\n`);
}

// 1) Work types: remove 色 from the live vocabulary.
replaceOne(
  'src/game/schema.ts',
  "export const workTypeSchema = z.enum(['燃', '謀', '笑', '情', '色', '怪']);",
  "export const workTypeSchema = z.enum(['燃', '謀', '笑', '情', '怪']);",
);
replaceOne(
  'src/content/catalog.ts',
  "export const WORK_TYPES: WorkType[] = ['燃', '謀', '笑', '情', '色', '怪'];",
  "export const WORK_TYPES: WorkType[] = ['燃', '謀', '笑', '情', '怪'];",
);

// 2) Schema vocabulary for additive work types, roll constraints, and coordination-card cost.
replaceOne(
  'src/game/schema.ts',
  "  z.object({ kind: z.literal('work.type'), target: workSelectorSchema, workType: workTypeSchema }),",
  `  z.object({ kind: z.literal('work.type'), target: workSelectorSchema, workType: workTypeSchema }),\n  z.object({ kind: z.literal('work.type.add'), target: workSelectorSchema, workType: workTypeSchema }),\n  z.object({\n    kind: z.literal('roll.forbid'),\n    target: memberSelectorSchema,\n    faces: z.array(z.number().int().min(1).max(6)).min(1),\n    duration: z.literal('round').default('round'),\n  }),`,
);
replaceOne(
  'src/game/schema.ts',
  "  z.object({ kind: z.literal('roll.floor'), value: z.number().int().min(1).max(6) }),",
  `  z.object({ kind: z.literal('roll.floor'), value: z.number().int().min(1).max(6) }),\n  z.object({ kind: z.literal('roll.forbid'), faces: z.array(z.number().int().min(1).max(6)).min(1) }),`,
);
replaceOne(
  'src/game/schema.ts',
  "  art: z.string().optional(),\n  target: z.discriminatedUnion('kind', [",
  "  art: z.string().optional(),\n  coordinationStressCost: z.number().int().nonnegative().optional(),\n  target: z.discriminatedUnion('kind', [",
);

// 3) State model: additive work types and round-scoped roll constraints.
replaceOne(
  'src/game/types.ts',
  `export interface TimedStatModifier {\n  id: string;\n  skill: SkillStat;\n  amount: number;\n  expiresAfterRound: number;\n}\n`,
  `export interface TimedStatModifier {\n  id: string;\n  skill: SkillStat;\n  amount: number;\n  expiresAfterRound: number;\n}\n\nexport interface TimedRollConstraint {\n  id: string;\n  forbiddenFaces: DieValue[];\n  expiresAfterRound: number;\n}\n`,
);
replaceOne(
  'src/game/types.ts',
  "  timedStatModifiers: TimedStatModifier[];\n  skillUsage: Record<string, number>;",
  "  timedStatModifiers: TimedStatModifier[];\n  timedRollConstraints: TimedRollConstraint[];\n  skillUsage: Record<string, number>;",
);
replaceOne(
  'src/game/types.ts',
  "  type: WorkType;\n  length: number;",
  "  type: WorkType;\n  extraTypes: WorkType[];\n  length: number;",
);

// 4) Engine: work-type helpers and roll resolution that can return no die.
replaceOne(
  'src/game/engine.ts',
  `export interface InitialGameOptions {\n  playerMemberIds?: string[];\n  enemyMemberIds?: string[];\n}`,
  `export interface InitialGameOptions {\n  playerMemberIds?: string[];\n  enemyMemberIds?: string[];\n  playerWorkTypes?: Partial<Record<string, WorkType>>;\n  enemyWorkTypes?: Partial<Record<string, WorkType>>;\n}`,
);
replaceOne(
  'src/game/engine.ts',
  `function chooseWorkType(engine: EngineSession, memberId: string): WorkType {\n  const definition = engine.content.characters[memberId];\n  if (!definition) throw new Error(\`Unknown character \${memberId}\`);\n  const candidates = characterWorkTypes(definition, engine.content);\n  if (!candidates.length) return '謀';\n  return candidates[Math.floor(engine.random() * candidates.length)] ?? candidates[0] ?? '謀';\n}`,
  `function chooseWorkType(engine: EngineSession, memberId: string): WorkType {\n  const definition = engine.content.characters[memberId];\n  if (!definition) throw new Error(\`Unknown character \${memberId}\`);\n  const candidates = characterWorkTypes(definition, engine.content);\n  if (!candidates.length) return '謀';\n  return candidates[Math.floor(engine.random() * candidates.length)] ?? candidates[0] ?? '謀';\n}\n\nexport function getInitialWorkTypeChoices(\n  memberId: string,\n  gameDefinition: GameDefinition = STANDARD_GAME_DEFINITION,\n): WorkType[] {\n  const definition = gameDefinition.content.characters[memberId];\n  if (!definition) throw new Error(\`Unknown character \${memberId}\`);\n  return characterWorkTypes(definition, gameDefinition.content);\n}`,
);
replaceOne(
  'src/game/engine.ts',
  `  rollDieFor(memberId: string, explicitFloor?: number): DieValue {\n    return this.randomDie(this.skills.getRollFloor(memberId, explicitFloor ?? 1));\n  }`,
  `  rollDieFor(memberId: string, explicitFloor?: number): DieValue | undefined {\n    const floor = this.skills.getRollFloor(memberId, explicitFloor ?? 1);\n    const forbidden = this.skills.getForbiddenRollFaces(memberId);\n    const weightedFaces = ([1, 2, 3, 4, 5, 6] as DieValue[])\n      .map((value) => this.asDieValue(Math.max(floor, value)))\n      .filter((value) => !forbidden.has(value));\n    if (!weightedFaces.length) return undefined;\n    return weightedFaces[Math.floor(this.random() * weightedFaces.length)] ?? weightedFaces[0];\n  }`,
);
replaceOne(
  'src/game/engine.ts',
  `  grantDice(teamId: TeamId, memberId: string, skill: SkillStat, count: number, origin: string, extra: boolean, explicitFloor?: number): DieToken[] {\n    const team = this.getTeam(teamId);\n    if (!team.members.some((member) => member.defId === memberId) || count <= 0) return [];\n    const dice = Array.from({ length: count }, (): DieToken => ({\n      id: this.uid('die'),\n      ownerId: memberId,\n      skill,\n      value: this.rollDieFor(memberId, explicitFloor),\n      round: this.state.round,\n      origin,\n    }));\n    team.pendingDice.push(...dice);\n    this.log(\`\${this.getDefinition(memberId).name} 因「\${origin}」獲得 \${count} 顆 \${skill.toUpperCase()} 骰。\`);\n    this.skills.emit({\n      type: 'afterDiceGranted',\n      teamId,\n      targetId: memberId,\n      skill,\n      amount: count,\n      dice,\n      sourceKind: 'skill-or-card',\n      metadata: { extra },\n    });\n    return dice;\n  }`,
  `  grantDice(teamId: TeamId, memberId: string, skill: SkillStat, count: number, origin: string, extra: boolean, explicitFloor?: number): DieToken[] {\n    const team = this.getTeam(teamId);\n    if (!team.members.some((member) => member.defId === memberId) || count <= 0) return [];\n    const dice: DieToken[] = [];\n    for (let i = 0; i < count; i += 1) {\n      const value = this.rollDieFor(memberId, explicitFloor);\n      if (value === undefined) continue;\n      dice.push({ id: this.uid('die'), ownerId: memberId, skill, value, round: this.state.round, origin });\n    }\n    if (!dice.length) {\n      this.log(\`\${this.getDefinition(memberId).name} 因所有骰面皆被限制，沒有獲得 \${skill.toUpperCase()} 骰。\`);\n      return [];\n    }\n    team.pendingDice.push(...dice);\n    this.log(\`\${this.getDefinition(memberId).name} 因「\${origin}」獲得 \${dice.length} 顆 \${skill.toUpperCase()} 骰。\`);\n    this.skills.emit({\n      type: 'afterDiceGranted',\n      teamId,\n      targetId: memberId,\n      skill,\n      amount: dice.length,\n      dice,\n      sourceKind: 'skill-or-card',\n      metadata: { extra },\n    });\n    return dice;\n  }`,
);
replaceOne(
  'src/game/engine.ts',
  `  getEffectiveAffinity(memberId: string): WorkType[] | 'all' {\n    const definition = this.getDefinition(memberId);\n    return this.skills.getAffinity(memberId, definition.affinities);\n  }`,
  `  getEffectiveAffinity(memberId: string): WorkType[] | 'all' {\n    const definition = this.getDefinition(memberId);\n    return this.skills.getAffinity(memberId, definition.affinities);\n  }\n\n  getWorkTypes(work: WorkState): WorkType[] {\n    return [...new Set([work.type, ...work.extraTypes])];\n  }\n\n  workHasType(work: WorkState, type: WorkType): boolean {\n    return this.getWorkTypes(work).includes(type);\n  }`,
);
replaceOne(
  'src/game/engine.ts',
  `      const affinity = this.getEffectiveAffinity(die.ownerId);\n      if (affinity !== 'all' && !affinity.includes(work.type)) return false;`,
  `      const affinity = this.getEffectiveAffinity(die.ownerId);\n      if (affinity !== 'all' && !this.getWorkTypes(work).some((type) => affinity.includes(type))) return false;`,
);
replaceOne(
  'src/game/engine.ts',
  `          for (let i = 0; i < this.getEffectiveStat(member.defId, skill); i += 1) {\n            batch.push({ id: this.uid('die'), ownerId: member.defId, skill, value: this.rollDieFor(member.defId), round: this.state.round, origin: '工作' });\n          }`,
  `          for (let i = 0; i < this.getEffectiveStat(member.defId, skill); i += 1) {\n            const value = this.rollDieFor(member.defId);\n            if (value === undefined) {\n              this.log(\`\${definition.name} 的 \${skill.toUpperCase()} 骰因沒有任何合法骰面而消失。\`);\n              continue;\n            }\n            batch.push({ id: this.uid('die'), ownerId: member.defId, skill, value, round: this.state.round, origin: '工作' });\n          }`,
);
replaceOne(
  'src/game/engine.ts',
  `    if (card.kind === 'coordination' && hasGameplayStatus(leader, GAMEPLAY_STATUS.coordinationDisabledAsLeader)) {\n      this.log(\`\${this.getDefinition(actorId).name} 擔任組長時不能使用統籌卡。\`);\n      return false;\n    }\n    if (!this.validateCardTarget(teamId, card, target)) return false;`,
  `    if (card.kind === 'coordination' && hasGameplayStatus(leader, GAMEPLAY_STATUS.coordinationDisabledAsLeader)) {\n      this.log(\`\${this.getDefinition(actorId).name} 擔任組長時不能使用統籌卡。\`);\n      return false;\n    }\n    const coordinationStressCost = card.kind === 'coordination' ? card.coordinationStressCost ?? 1 : 0;\n    const coordinationStressBearer = coordinationStressCost > 0\n      ? this.skills.getCoordinationStressBearer(teamId, coordinationStressCost)\n      : undefined;\n    if (coordinationStressCost > 0 && !coordinationStressBearer) {\n      this.log(\`\${team.name} 沒有任何組員能合法承擔統籌卡的 \${coordinationStressCost} 點壓力，因此不能使用「\${card.name}」。\`);\n      return false;\n    }\n    if (!this.validateCardTarget(teamId, card, target)) return false;`,
);
replaceOne(
  'src/game/engine.ts',
  `      if (card.kind === 'coordination') {\n        const bearerId = this.skills.getCoordinationStressBearer(teamId) ?? actorId;\n        this.adjustStress(teamId, bearerId, 1, '使用統籌卡', true, actorId);\n      }`,
  `      if (coordinationStressCost > 0 && coordinationStressBearer) {\n        this.adjustStress(teamId, coordinationStressBearer, coordinationStressCost, '使用統籌卡', true, actorId);\n      }`,
);
replaceOne(
  'src/game/engine.ts',
  `        member.timedStatModifiers = member.timedStatModifiers.filter((modifier) => modifier.expiresAfterRound > this.state.round);\n        for (const [status, value] of Object.entries(member.statuses)) {`,
  `        member.timedStatModifiers = member.timedStatModifiers.filter((modifier) => modifier.expiresAfterRound > this.state.round);\n        member.timedRollConstraints = member.timedRollConstraints.filter((constraint) => constraint.expiresAfterRound > this.state.round);\n        for (const [status, value] of Object.entries(member.statuses)) {`,
);
replaceOne(
  'src/game/engine.ts',
  `function createTeam(engine: EngineSession, id: TeamId, name: string, memberIds: string[]): TeamState {`,
  `function createTeam(\n  engine: EngineSession,\n  id: TeamId,\n  name: string,\n  memberIds: string[],\n  initialWorkTypes: Partial<Record<string, WorkType>> = {},\n): TeamState {`,
);
replaceOne(
  'src/game/engine.ts',
  `      permanentStats: cloneStats(definition.stats),\n      timedStatModifiers: [],\n      skillUsage: {},`,
  `      permanentStats: cloneStats(definition.stats),\n      timedStatModifiers: [],\n      timedRollConstraints: [],\n      skillUsage: {},`,
);
replaceOne(
  'src/game/engine.ts',
  `  const works: WorkState[] = memberIds.map((ownerId) => ({\n    id: engine.uid('work'),\n    ownerId,\n    title: \`\${engine.content.characters[ownerId]?.name ?? ownerId} 的作品\`,\n    type: chooseWorkType(engine, ownerId),\n    length: workLength,\n    slots: Array.from({ length: workLength }, () => ({})),\n  }));`,
  `  const works: WorkState[] = memberIds.map((ownerId) => {\n    const requestedType = initialWorkTypes[ownerId];\n    if (requestedType) {\n      const definition = engine.content.characters[ownerId];\n      if (!definition) throw new Error(\`Unknown character \${ownerId}\`);\n      const legalTypes = characterWorkTypes(definition, engine.content);\n      if (!legalTypes.includes(requestedType)) {\n        throw new Error(\`Character \${ownerId} cannot start with work type \${requestedType}.\`);\n      }\n    }\n    return {\n      id: engine.uid('work'),\n      ownerId,\n      title: \`\${engine.content.characters[ownerId]?.name ?? ownerId} 的作品\`,\n      type: requestedType ?? chooseWorkType(engine, ownerId),\n      extraTypes: [],\n      length: workLength,\n      slots: Array.from({ length: workLength }, () => ({})),\n    };\n  });`,
);
replaceOne(
  'src/game/engine.ts',
  `  const player = createTeam(bootstrap, 'player', rules.player.name, playerMemberIds);\n  const enemy = createTeam(bootstrap, 'enemy', rules.enemy.name, enemyMemberIds);`,
  `  const player = createTeam(bootstrap, 'player', rules.player.name, playerMemberIds, options.playerWorkTypes);\n  const enemy = createTeam(bootstrap, 'enemy', rules.enemy.name, enemyMemberIds, options.enemyWorkTypes);`,
);

// 5) Skill runtime: multi-type conditions, forbidden faces, and headroom-based coordination bearer.
replaceOne(
  'src/game/skillRuntime.ts',
  `  if (condition.kind === 'workType') {\n    const works = engine.resolveWorks(condition.target, context);\n    return works.some((work) => condition.types.includes(work.type));\n  }`,
  `  if (condition.kind === 'workType') {\n    const works = engine.resolveWorks(condition.target, context);\n    return works.some((work) => condition.types.some((type) => engine.workHasType(work, type)));\n  }`,
);
replaceOne(
  'src/game/skillRuntime.ts',
  `  getRollFloor(memberId: string, base = 1): number {\n    let floor = base;\n    for (const passive of this.passives(memberId)) {\n      if (passive.kind === 'roll.floor') floor = Math.max(floor, passive.value);\n    }\n    return Math.min(6, Math.max(1, floor));\n  }\n\n  getCoordinationStressBearer(teamId: 'player' | 'enemy'): string | undefined {\n    const team = this.engine.getTeam(teamId);\n    const leader = this.engine.getCharacter(teamId, team.leaderId);\n    if (!leader) return undefined;\n\n    return team.members.find((member) => {\n      if (member.defId === team.leaderId || hasGameplayStatus(member, GAMEPLAY_STATUS.hidden)) return false;\n      return this.passives(member.defId).some((passive) => {\n        if (passive.kind !== 'coordination.stressBearer') return false;\n        return passive.allowEqual ? member.stress <= leader.stress : member.stress < leader.stress;\n      });\n    })?.defId;\n  }`,
  `  getRollFloor(memberId: string, base = 1): number {\n    let floor = base;\n    for (const passive of this.passives(memberId)) {\n      if (passive.kind === 'roll.floor') floor = Math.max(floor, passive.value);\n    }\n    return Math.min(6, Math.max(1, floor));\n  }\n\n  getForbiddenRollFaces(memberId: string): Set<number> {\n    const result = new Set<number>();\n    for (const passive of this.passives(memberId)) {\n      if (passive.kind === 'roll.forbid') passive.faces.forEach((face) => result.add(face));\n    }\n    const teamId = this.engine.findMemberTeam(memberId);\n    const member = teamId ? this.engine.getCharacter(teamId, memberId) : undefined;\n    for (const constraint of member?.timedRollConstraints ?? []) {\n      constraint.forbiddenFaces.forEach((face) => result.add(face));\n    }\n    return result;\n  }\n\n  getCoordinationStressBearer(teamId: 'player' | 'enemy', amount = 1): string | undefined {\n    const team = this.engine.getTeam(teamId);\n    const leader = this.engine.getCharacter(teamId, team.leaderId);\n    if (!leader) return undefined;\n\n    const headroom = (memberId: string): number => {\n      const member = this.engine.getCharacter(teamId, memberId);\n      const maxStress = this.engine.getEffectiveMaxStress(teamId, memberId);\n      if (!member || maxStress === undefined) return -Infinity;\n      if (maxStress === null) return Infinity;\n      return Math.max(0, maxStress - member.stress);\n    };\n\n    const leaderHeadroom = headroom(team.leaderId);\n    const viceCandidates = team.members\n      .filter((member) => member.defId !== team.leaderId && !hasGameplayStatus(member, GAMEPLAY_STATUS.hidden))\n      .filter((member) => this.passives(member.defId).some((passive) => passive.kind === 'coordination.stressBearer'))\n      .map((member) => ({ member, headroom: headroom(member.defId) }))\n      .filter((entry) => entry.headroom >= amount && entry.headroom > leaderHeadroom)\n      .sort((a, b) => b.headroom - a.headroom);\n\n    if (viceCandidates[0]) return viceCandidates[0].member.defId;\n    return leaderHeadroom >= amount ? team.leaderId : undefined;\n  }`,
);

// 6) Effect runtime: additive work types, temporary roll constraints, and disappearing rerolls.
replaceOne(
  'src/game/effectRegistry.ts',
  `    if (effect.requireOwnerWorkType) {\n      const ownerWork = engine.getTeam(context.ownerTeamId).works.find((work) => work.ownerId === context.ownerId);\n      if (ownerWork?.type !== effect.requireOwnerWorkType) return false;\n    }`,
  `    if (effect.requireOwnerWorkType) {\n      const ownerWork = engine.getTeam(context.ownerTeamId).works.find((work) => work.ownerId === context.ownerId);\n      if (!ownerWork || !engine.workHasType(ownerWork, effect.requireOwnerWorkType)) return false;\n    }`,
);
replaceOne(
  'src/game/effectRegistry.ts',
  `    const rolls = Array.from({ length: effect.rolls }, () => engine.rollDieFor(context.ownerId));\n    const best = Math.max(...rolls);`,
  `    const rolls = Array.from({ length: effect.rolls }, () => engine.rollDieFor(context.ownerId))\n      .filter((value): value is NonNullable<typeof value> => value !== undefined);\n    if (!rolls.length) return blocked && selectedMembers.length > 0;\n    const best = Math.max(...rolls);`,
);
replaceOne(
  'src/game/effectRegistry.ts',
  `      const before = die.value;\n      die.value = engine.rollDieFor(die.ownerId);\n      changed += 1;\n      engine.log(\`\${context.definition.name}：\${engine.getDefinition(die.ownerId).name} 重擲 \${before} → \${die.value}。\`);`,
  `      const before = die.value;\n      const rerolled = engine.rollDieFor(die.ownerId);\n      if (rerolled === undefined) {\n        if (context.event.dice) context.event.dice = context.event.dice.filter((candidate) => candidate.id !== die.id);\n        for (const teamId of ['player', 'enemy'] as const) {\n          const team = engine.getTeam(teamId);\n          team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== die.id);\n        }\n        changed += 1;\n        engine.log(\`\${context.definition.name}：\${engine.getDefinition(die.ownerId).name} 的骰子因沒有任何合法骰面而消失。\`);\n        continue;\n      }\n      die.value = rerolled;\n      changed += 1;\n      engine.log(\`\${context.definition.name}：\${engine.getDefinition(die.ownerId).name} 重擲 \${before} → \${die.value}。\`);`,
);
replaceOne(
  'src/game/effectRegistry.ts',
  `  .register('work.type', (effect, context, engine) => {\n    const { selected: selectedWorks, applicable: works } = resolveEffectWorks(effect.target, context, engine);\n    for (const work of works) work.type = effect.workType;\n    return selectedWorks.length > 0;\n  })`,
  `  .register('work.type', (effect, context, engine) => {\n    const { selected: selectedWorks, applicable: works } = resolveEffectWorks(effect.target, context, engine);\n    for (const work of works) {\n      work.type = effect.workType;\n      work.extraTypes = [];\n    }\n    return selectedWorks.length > 0;\n  })\n  .register('work.type.add', (effect, context, engine) => {\n    const { selected: selectedWorks, applicable: works } = resolveEffectWorks(effect.target, context, engine);\n    for (const work of works) {\n      if (!engine.workHasType(work, effect.workType)) work.extraTypes.push(effect.workType);\n    }\n    return selectedWorks.length > 0;\n  })\n  .register('roll.forbid', (effect, context, engine) => {\n    const { selected: selectedMembers, applicable: targets } = resolveEffectMembers(effect.target, context, engine);\n    for (const { member } of targets) {\n      member.timedRollConstraints.push({\n        id: engine.uid('roll-constraint'),\n        forbiddenFaces: [...new Set(effect.faces)].map((face) => engine.asDieValue(face)),\n        expiresAfterRound: engine.state.round,\n      });\n    }\n    return selectedMembers.length > 0;\n  })`,
);

// 7) Guide: no normal coordination pressure fee; target pays +1 stress and threshold depends on current stat.
replaceOne(
  'src/content/cards.ts',
  `    description: '對能力 0 或 1 的組員：額外擲 1 顆該能力骰；若為 6，該能力永久 +1。',\n    art: cardArt('guide.svg'),\n    target: { kind: 'member', relation: 'ally', skillPicker: true },`,
  `    description: '指定能力為 0 或 1 的己方組員：擲 1 顆該能力骰並使目標壓力 +1；骰值 >= 5 + 目前能力值時，該能力永久 +1。本卡不支付通常的統籌卡壓力費用。',\n    art: cardArt('guide.svg'),\n    coordinationStressCost: 0,\n    target: { kind: 'member', relation: 'ally', skillPicker: true },`,
);
replaceOne(
  'src/game/cardHandlers.ts',
  `registerCardHandler('guide', (team, _card, target, engine) => {\n  const member = team.members.find((item) => item.defId === target.memberId);\n  const skill = target.skill;\n  if (!member || !skill || engine.getEffectiveStat(member.defId, skill) > 1) return false;\n  if (isCardEffectBlocked(engine, member.defId)) return true;\n  const die = engine.grantDice(team.id, member.defId, skill, 1, '指導', true)[0];\n  if (die?.value === 6) {\n    member.permanentStats[skill] += 1;\n    engine.log(\`「指導」擲出 6：\${engine.getDefinition(member.defId).name} 的 \${skill.toUpperCase()} 永久 +1。\`);\n  }\n  return !!die;\n});`,
  `registerCardHandler('guide', (team, _card, target, engine) => {\n  const member = team.members.find((item) => item.defId === target.memberId);\n  const skill = target.skill;\n  if (!member || !skill) return false;\n  const current = engine.getEffectiveStat(member.defId, skill);\n  if (current > 1) return false;\n  if (isCardEffectBlocked(engine, member.defId)) return true;\n  const die = engine.grantDice(team.id, member.defId, skill, 1, '指導', true)[0];\n  if (!die) return false;\n  engine.adjustStress(team.id, member.defId, 1, '指導', true, team.leaderId);\n  const threshold = 5 + current;\n  if (die.value >= threshold) {\n    member.permanentStats[skill] += 1;\n    engine.log(\`「指導」擲出 \${die.value}：\${engine.getDefinition(member.defId).name} 的 \${skill.toUpperCase()} 永久 +1。\`);\n  }\n  return true;\n});`,
);

replaceOne(
  'src/content/viceLeaderSkill.ts',
  "  description: '隊伍使用統籌卡時，如果自身壓力小於組長，由自身代替組長承擔 +1 外部壓力。',",
  "  description: '隊伍使用需要壓力費用的統籌卡時，若自身距離壓力上限的剩餘空間比組長更多，由自身代替組長承擔該費用。',",
);

// 8) Tests for the new P0 contracts.
const testFile = `import { describe, expect, it } from 'vitest';\nimport { STANDARD_GAME_DEFINITION, WORK_TYPES } from '../content/catalog';\nimport { createInitialGame, EngineSession, getInitialWorkTypeChoices } from '../game/engine';\nimport { workTypeSchema } from '../game/schema';\n\nconst playerIds = ['user79', 'meteor', 'avocado'];\nconst enemyIds = ['pintbox', 'mashiro', 'happy'];\n\nfunction create(rng: () => number = () => 0.99) {\n  const state = createInitialGame(rng, STANDARD_GAME_DEFINITION, {\n    playerMemberIds: playerIds,\n    enemyMemberIds: enemyIds,\n  });\n  return { state, engine: new EngineSession(state, rng, STANDARD_GAME_DEFINITION) };\n}\n\ndescribe('2026-09-19 discussion P0 rules', () => {\n  it('removes 色 from the live work-type vocabulary', () => {\n    expect(WORK_TYPES).toEqual(['燃', '謀', '笑', '情', '怪']);\n    expect(workTypeSchema.safeParse('色').success).toBe(false);\n  });\n\n  it('supports explicit legal initial work-type choices', () => {\n    expect(getInitialWorkTypeChoices('happy')).toContain('怪');\n    const state = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {\n      playerMemberIds: ['happy', 'user79', 'meteor'],\n      enemyMemberIds: ['pintbox', 'mashiro', 'avocado'],\n      playerWorkTypes: { happy: '怪', user79: '謀', meteor: '燃' },\n    });\n    expect(state.player.works.find((work) => work.ownerId === 'happy')?.type).toBe('怪');\n    expect(() => createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {\n      playerMemberIds: ['happy', 'user79', 'meteor'],\n      enemyMemberIds: ['pintbox', 'mashiro', 'avocado'],\n      playerWorkTypes: { happy: '燃' },\n    })).toThrow(/cannot start with work type/);\n  });\n\n  it('treats extra work types as valid affinity matches', () => {\n    const state = createInitialGame(() => 0.99, STANDARD_GAME_DEFINITION, {\n      playerMemberIds: ['happy', 'user79', 'meteor'],\n      enemyMemberIds: ['pintbox', 'mashiro', 'avocado'],\n    });\n    const engine = new EngineSession(state, () => 0.99, STANDARD_GAME_DEFINITION);\n    const targetWork = state.player.works.find((work) => work.ownerId === 'user79')!;\n    targetWork.type = '謀';\n    targetWork.extraTypes = ['怪'];\n    const die = engine.grantDice('player', 'happy', 'design', 1, 'test', false)[0]!;\n    expect(engine.workHasType(targetWork, '謀')).toBe(true);\n    expect(engine.workHasType(targetWork, '怪')).toBe(true);\n    expect(engine.canPlaceDie('player', die, targetWork, 0)).toBe(true);\n  });\n\n  it('uses remaining stress headroom to choose a coordination bearer', () => {\n    const { state, engine } = create();\n    const leader = state.player.members.find((member) => member.defId === 'user79')!;\n    const vice = state.player.members.find((member) => member.defId === 'meteor')!;\n\n    leader.stress = 5; // effective max 6 => headroom 1\n    vice.stress = 2; // max 4 => headroom 2\n    expect(engine.skills.getCoordinationStressBearer('player', 1)).toBe('meteor');\n\n    leader.stress = 4; // headroom 2\n    vice.stress = 3; // headroom 1\n    expect(engine.skills.getCoordinationStressBearer('player', 1)).toBe('user79');\n\n    leader.stress = 6;\n    vice.stress = 4;\n    expect(engine.skills.getCoordinationStressBearer('player', 1)).toBeUndefined();\n  });\n\n  it('makes 指導 skip the normal coordination fee while charging the target', () => {\n    const { state, engine } = create(() => 0.99);\n    state.player.hand = [{ instanceId: 'guide-test', cardId: 'guide' }];\n    const leader = state.player.members.find((member) => member.defId === 'user79')!;\n    const target = state.player.members.find((member) => member.defId === 'avocado')!;\n    expect(target.permanentStats.design).toBe(1);\n\n    expect(engine.playCard('player', 'guide-test', { memberId: 'avocado', skill: 'design' })).toBe(true);\n    expect(leader.stress).toBe(0);\n    expect(target.stress).toBe(1);\n    expect(target.permanentStats.design).toBe(2);\n  });\n\n  it('removes a die when every face is forbidden instead of retrying forever', () => {\n    const { state, engine } = create(() => 0);\n    const member = state.player.members.find((item) => item.defId === 'avocado')!;\n    member.timedRollConstraints.push({ id: 'partial', forbiddenFaces: [1, 2, 5, 6], expiresAfterRound: 1 });\n    expect(engine.rollDieFor('avocado')).toBe(3);\n    member.timedRollConstraints.push({ id: 'rest', forbiddenFaces: [3, 4], expiresAfterRound: 1 });\n    expect(engine.rollDieFor('avocado')).toBeUndefined();\n    expect(engine.grantDice('player', 'avocado', 'design', 1, 'blocked', true)).toEqual([]);\n  });\n});\n`;
write('src/tests/discussion-p0-rules.test.ts', testFile);

// 9) Mandatory documentation sync. These sections are intentionally explicit current-rule overrides.
appendOnce('GAME_RULES.md', '## 2026-09-19 P0 discussion rules', `## 2026-09-19 P0 discussion rules\n\n- Live work types are now **燃 / 謀 / 笑 / 情 / 怪**; **色** is removed from the runtime vocabulary.\n- A work has one primary type plus optional extra types. Affinity checks and work-type skill conditions match any current type. A replace-type effect clears extra types; an add-type effect preserves the primary type.\n- Initial game construction supports an explicit legal work-type choice per character; choices must be within that character's effective affinity (including all-affinity passives). The player-facing selection UI is tracked separately from this engine contract.\n- Dice rolls resolve against a shared forbidden-face set. If no legal face remains, that die disappears instead of retrying indefinitely.\n- Coordination-card stress cost must have a legal bearer before the card can be used. Vice-leader bearers are chosen by remaining Stress headroom, not raw Stress.\n- 指導 has coordination stress cost 0; it instead gives its target +1 Stress. A stat 0 target succeeds on 5–6, a stat 1 target succeeds on 6.`);
appendOnce('GAME_MANUAL.md', '## 2026-09-19 規則更新', `## 2026-09-19 規則更新\n\n目前作品類型為 **燃、謀、笑、情、怪**。作品可以因技能額外擁有其他類型；支援適性只要符合其中任一類型即可。\n\n需要支付壓力費用的統籌卡，只有在組長或符合條件的副組長仍有足夠壓力空間時才能使用；副組長是否代為承擔改看「距離壓力上限還剩多少」。\n\n**指導**不支付通常的統籌卡壓力費用。指定能力為 0 或 1 的組員後，目標壓力 +1 並擲 1 顆該能力骰；能力 0 時擲到 5–6、能力 1 時擲到 6，該能力永久 +1。\n\n若多個效果使一顆骰子的 1～6 全部都成為不可出現的結果，該骰直接消失。`);
appendOnce('PROJECT_STATUS.md', '### 2026-09-19 P0 discussion update', `### 2026-09-19 P0 discussion update\n\nIn progress on branch \`feature/20260919-discussion-update-p0\`:\n\n- removed live work type \`色\`;\n- added additive/multi-type work runtime support;\n- added shared forbidden-face roll constraints and no-legal-face die removal;\n- changed coordination stress-bearer selection to Stress headroom and reject cards with no legal bearer;\n- added engine support for explicit initial work-type choices;\n- updated 指導 pressure semantics.\n\nThe player-facing initial work-type selection screen remains the next P0 UI task.`);
appendOnce('SKILL_AUTHORING.md', '## 2026-09-19 vocabulary additions', `## 2026-09-19 vocabulary additions\n\nNew gameplay vocabulary:\n\n- \`work.type.add\`: add a work type without replacing its primary type.\n- \`roll.forbid\` effect: forbid one or more die faces for selected members through the current round.\n- \`roll.forbid\` passive: permanently forbid one or more faces for a character.\n\n\`work.type\` remains a replace operation and clears additive extra types. Work-type conditions now match any type currently carried by the work.`);
appendOnce('ARCHITECTURE.md', '## 2026-09-19 work-type and roll-constraint boundary', `## 2026-09-19 work-type and roll-constraint boundary\n\n\`WorkState\` keeps a primary \`type\` plus \`extraTypes\`. Rule code must use \`EngineSession.getWorkTypes/workHasType\` instead of directly assuming a single type when checking affinity or conditions.\n\nRoll legality is centralized in \`EngineSession.rollDieFor\`, combining roll-floor passives, permanent forbidden-face passives, and round-scoped roll constraints. A roll may resolve to no die when all faces are forbidden; callers must preserve that disappearance semantic.\n\nCoordination payment legality is resolved before card effects and uses \`SkillRuntime.getCoordinationStressBearer\`.`);
appendOnce('ONLINE_MULTIPLAYER.md', '## 2026-09-19 shared-state compatibility note', `## 2026-09-19 shared-state compatibility note\n\nCore match state now includes work \`extraTypes\` and member \`timedRollConstraints\`. Online continues to use the shared \`GameState\` snapshot/engine path; peers must run the same game version so these fields and their semantics stay deterministic.`);

// Audit unresolved runtime references to the removed type. Source notes/docs can mention it; live TS affinities/effects cannot.
const tsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.ts')) tsFiles.push(full);
  }
}
walk(path.join(root, 'src'));
const suspicious = [];
for (const full of tsFiles) {
  const rel = path.relative(root, full).replaceAll('\\', '/');
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("'色'") && (line.includes('affinities') || line.includes('workType') || line.includes('types:'))) {
      suspicious.push(`${rel}:${index + 1}: ${line.trim()}`);
    }
  });
}
if (suspicious.length) {
  throw new Error(`Removed work type 色 still appears in live TS rules:\n${suspicious.join('\n')}`);
}

console.log('P0 discussion update applied successfully.');
