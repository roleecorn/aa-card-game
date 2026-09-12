import { z } from 'zod';

export const skillStatSchema = z.enum(['design', 'text', 'aa']);
export const workTypeSchema = z.enum(['燃', '謀', '笑', '情', '色', '怪']);
export const teamIdSchema = z.enum(['player', 'enemy']);
export const usageScopeSchema = z.enum(['round', 'game']);

export const numberValueSchema = z.union([
  z.number(),
  z.object({ fromEvent: z.enum(['amount', 'diceCount']) }),
]);

export const memberSelectorSchema = z.enum([
  'owner',
  'eventActor',
  'eventTarget',
  'eventSource',
  'selectedMember',
  'selectedWorkOwner',
  'teamLeader',
  'allAllies',
  'otherAllies',
  'allEnemies',
  'randomAlly',
  'randomOtherAlly',
  'randomEnemy',
  'highestStressAlly',
  'lowestStressAlly',
  'highestStressEnemy',
  'lowestStressEnemy',
]);

export const workSelectorSchema = z.enum([
  'ownerWork',
  'eventWork',
  'selectedWork',
  'allAllyWorks',
  'allEnemyWorks',
  'randomAllyWork',
  'randomEnemyWork',
  'lowestScoreAllyWork',
  'highestScoreAllyWork',
  'lowestScoreEnemyWork',
  'highestScoreEnemyWork',
]);

export const usageRuleSchema = z.object({
  scope: usageScopeSchema,
  limit: z.number().int().positive(),
  key: z.string().optional(),
});

export type SkillCondition =
  | { kind: 'always' }
  | { kind: 'all'; conditions: SkillCondition[] }
  | { kind: 'any'; conditions: SkillCondition[] }
  | { kind: 'not'; condition: SkillCondition }
  | { kind: 'relation'; field: 'actorId' | 'targetId' | 'sourceId'; relation: 'self' | 'ally' | 'otherAlly' | 'enemy' }
  | { kind: 'ownerStress'; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; value: number }
  | { kind: 'eventAmount'; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; value: number }
  | { kind: 'eventSkill'; skill: 'design' | 'text' | 'aa' }
  | { kind: 'sourceKind'; value: string }
  | { kind: 'eventMeta'; key: string; equals: string | number | boolean }
  | { kind: 'diceMatch'; skill?: 'design' | 'text' | 'aa'; minValue?: number; maxValue?: number; countAtLeast?: number }
  | { kind: 'ownerHasStatus'; status: string }
  | { kind: 'round'; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; value: number }
  | { kind: 'ownerStat'; skill: 'design' | 'text' | 'aa'; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; value: number }
  | { kind: 'pendingDice'; target: z.infer<typeof memberSelectorSchema>; skill?: 'design' | 'text' | 'aa'; minValue?: number; maxValue?: number; countAtLeast?: number }
  | { kind: 'workType'; target: z.infer<typeof workSelectorSchema>; types: z.infer<typeof workTypeSchema>[] }
  | { kind: 'workScore'; target: z.infer<typeof workSelectorSchema>; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; value: number; quantifier?: 'any' | 'all' }
  | { kind: 'chance'; probability: number };

export const conditionSchema: z.ZodType<SkillCondition> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('always') }),
    z.object({ kind: z.literal('all'), conditions: z.array(conditionSchema) }),
    z.object({ kind: z.literal('any'), conditions: z.array(conditionSchema) }),
    z.object({ kind: z.literal('not'), condition: conditionSchema }),
    z.object({
      kind: z.literal('relation'),
      field: z.enum(['actorId', 'targetId', 'sourceId']),
      relation: z.enum(['self', 'ally', 'otherAlly', 'enemy']),
    }),
    z.object({
      kind: z.literal('ownerStress'),
      op: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']),
      value: z.number(),
    }),
    z.object({
      kind: z.literal('eventAmount'),
      op: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']),
      value: z.number(),
    }),
    z.object({ kind: z.literal('eventSkill'), skill: skillStatSchema }),
    z.object({ kind: z.literal('sourceKind'), value: z.string() }),
    z.object({
      kind: z.literal('eventMeta'),
      key: z.string(),
      equals: z.union([z.string(), z.number(), z.boolean()]),
    }),
    z.object({
      kind: z.literal('diceMatch'),
      skill: skillStatSchema.optional(),
      minValue: z.number().int().min(1).max(6).optional(),
      maxValue: z.number().int().min(1).max(6).optional(),
      countAtLeast: z.number().int().positive().optional(),
    }),
    z.object({ kind: z.literal('ownerHasStatus'), status: z.string() }),
    z.object({
      kind: z.literal('round'),
      op: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']),
      value: z.number().int().nonnegative(),
    }),
    z.object({
      kind: z.literal('ownerStat'),
      skill: skillStatSchema,
      op: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']),
      value: z.number(),
    }),
    z.object({
      kind: z.literal('pendingDice'),
      target: memberSelectorSchema,
      skill: skillStatSchema.optional(),
      minValue: z.number().int().min(1).max(6).optional(),
      maxValue: z.number().int().min(1).max(6).optional(),
      countAtLeast: z.number().int().nonnegative().optional(),
    }),
    z.object({
      kind: z.literal('workType'),
      target: workSelectorSchema,
      types: z.array(workTypeSchema).min(1),
    }),
    z.object({
      kind: z.literal('workScore'),
      target: workSelectorSchema,
      op: z.enum(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']),
      value: z.number(),
      quantifier: z.enum(['any', 'all']).optional(),
    }),
    z.object({
      kind: z.literal('chance'),
      probability: z.number().min(0).max(1),
    }),
  ]),
);

export const effectSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('stress.change'),
    target: memberSelectorSchema,
    amount: numberValueSchema,
    external: z.boolean().optional(),
    source: z.string().optional(),
  }),
  z.object({
    kind: z.literal('stress.set'),
    target: memberSelectorSchema,
    value: z.number().int().nonnegative(),
    source: z.string().optional(),
  }),
  z.object({
    kind: z.literal('event.amount'),
    amount: z.number(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({ kind: z.literal('event.cancel') }),
  z.object({
    kind: z.literal('dice.grant'),
    target: memberSelectorSchema,
    skill: skillStatSchema,
    count: numberValueSchema,
    minRoll: z.number().int().min(1).max(6).optional(),
    origin: z.string().optional(),
    extra: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('dice.grantBestOf'),
    target: memberSelectorSchema,
    skill: skillStatSchema,
    rolls: z.number().int().min(2),
    count: z.number().int().positive().default(1),
    origin: z.string().optional(),
    requireOwnerWorkType: workTypeSchema.optional(),
  }),
  z.object({
    kind: z.literal('dice.rerollBatch'),
    count: z.number().int().positive(),
    skill: skillStatSchema.optional(),
    minValue: z.number().int().min(1).max(6).optional(),
    maxValue: z.number().int().min(1).max(6).optional(),
    lowestFirst: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('dice.modifyPending'),
    target: memberSelectorSchema,
    skill: skillStatSchema.optional(),
    add: z.number().int().optional(),
    set: z.number().int().min(1).max(6).optional(),
    minValue: z.number().int().min(1).max(6).optional(),
    maxValue: z.number().int().min(1).max(6).optional(),
    limit: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal('dice.copySelectedValue'),
    source: z.literal('selectedSourceDie'),
    target: z.literal('selectedTargetDie'),
  }),
  z.object({
    kind: z.literal('dice.modifySelected'),
    add: z.number().int().optional(),
    set: z.number().int().min(1).max(6).optional(),
  }),
  z.object({ kind: z.literal('dice.removeSelected') }),
  z.object({
    kind: z.literal('dice.removePending'),
    target: memberSelectorSchema,
    skill: skillStatSchema.optional(),
    minValue: z.number().int().min(1).max(6).optional(),
    maxValue: z.number().int().min(1).max(6).optional(),
    count: z.number().int().positive().optional(),
    order: z.enum(['lowest', 'highest', 'random', 'first']).default('first'),
  }),
  z.object({
    kind: z.literal('dice.convertPending'),
    target: memberSelectorSchema,
    fromSkill: skillStatSchema.optional(),
    toSkill: skillStatSchema,
    count: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal('stat.change'),
    target: memberSelectorSchema,
    skill: skillStatSchema,
    amount: z.number().int(),
    duration: z.enum(['permanent', 'round']).default('permanent'),
  }),
  z.object({
    kind: z.literal('work.length'),
    target: workSelectorSchema,
    amount: z.number().int(),
    min: z.number().int().positive().optional(),
  }),
  z.object({ kind: z.literal('work.type'), target: workSelectorSchema, workType: workTypeSchema }),
  z.object({
    kind: z.literal('work.progress.add'),
    target: workSelectorSchema,
    skill: skillStatSchema,
    value: z.number().int().min(1).max(6),
    slot: z.union([z.number().int().nonnegative(), z.literal('firstAvailable')]).optional(),
  }),
  z.object({
    kind: z.literal('work.progress.fill'),
    target: workSelectorSchema,
    value: z.number().int().min(1).max(6),
  }),
  z.object({
    kind: z.literal('work.progress.rerollLowest'),
    target: workSelectorSchema,
    count: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal('work.progress.clear'),
    target: workSelectorSchema,
    skill: skillStatSchema.optional(),
    count: z.number().int().positive().optional(),
    order: z.enum(['lowest', 'highest', 'random', 'first']).default('first'),
  }),
  z.object({ kind: z.literal('cards.add'), cardId: z.string(), count: numberValueSchema }),
  z.object({ kind: z.literal('cards.draw'), targetTeam: z.enum(['owner', 'eventTeam']).default('owner'), count: numberValueSchema }),
  z.object({ kind: z.literal('cards.discardRandom'), targetTeam: z.enum(['owner', 'enemy']), count: numberValueSchema }),
  z.object({
    kind: z.literal('status.change'),
    target: memberSelectorSchema,
    status: z.string(),
    stacks: z.number().int(),
    durationRounds: z.number().int().positive().optional(),
    stacking: z.enum(['stack', 'replace', 'max']).default('stack'),
  }),
  z.object({ kind: z.literal('log'), text: z.string() }),
  z.object({ kind: z.literal('custom'), handler: z.string(), args: z.record(z.string(), z.unknown()).optional() }),
]);

export const passiveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('affinity.grant'), types: z.union([z.array(workTypeSchema), z.literal('all')]) }),
  z.object({ kind: z.literal('roll.floor'), value: z.number().int().min(1).max(6) }),
  z.object({ kind: z.literal('coordination.stressBearer') }),
  z.object({ kind: z.literal('effect.immunity'), source: z.literal('external') }),
]);

export const triggerSchema = z.object({
  event: z.enum([
    'gameStart',
    'roundStart',
    'roundEnd',
    'afterRollBatch',
    'afterDiceGranted',
    'beforeExternalStress',
    'afterExternalStress',
    'beforeDieModified',
    'afterDieModified',
    'afterDiePlaced',
    'cardPlayed',
    'activeSkill',
  ]),
  condition: conditionSchema.optional(),
  effects: z.array(effectSchema).min(1),
  usage: usageRuleSchema.optional(),
  priority: z.number().int().optional(),
});

export const activeTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('member'), relation: z.enum(['ally', 'otherAlly', 'enemy']) }),
  z.object({ kind: z.literal('taggedMember'), tag: z.string().min(1), excludeSelf: z.boolean().default(false) }),
  z.object({ kind: z.literal('work'), relation: z.enum(['ally', 'enemy', 'owner']) }),
  z.object({ kind: z.literal('copyPendingDie'), source: z.literal('otherAlly'), target: z.literal('self') }),
  z.object({
    kind: z.literal('pendingDie'),
    relation: z.enum(['self', 'ally', 'otherAlly', 'enemy']),
    skill: skillStatSchema.optional(),
    minValue: z.number().int().min(1).max(6).optional(),
    maxValue: z.number().int().min(1).max(6).optional(),
  }),
]);

export const skillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  activation: z.enum(['passive', 'triggered', 'active']),
  status: z.enum(['implemented', 'partial', 'planned']),
  triggers: z.array(triggerSchema).optional(),
  passives: z.array(passiveSchema).optional(),
  activeEffects: z.array(effectSchema).optional(),
  activeUsage: usageRuleSchema.optional(),
  activeHint: z.string().optional(),
  activeTarget: activeTargetSchema.optional(),
  tags: z.array(z.string()).optional(),
  ai: z.object({ autoUse: z.boolean(), when: z.enum(['always', 'ownerStressed']).default('always') }).optional(),
});

export const characterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  stats: z.object({ design: z.number().int().nonnegative(), text: z.number().int().nonnegative(), aa: z.number().int().nonnegative() }),
  maxStress: z.number().int().positive().nullable(),
  affinities: z.array(workTypeSchema),
  skillIds: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  portrait: z.string().optional(),
  compactPortrait: z.string().optional(),
  portraitPosition: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  resource: z.object({
    name: z.string().min(1),
    max: z.number().int().positive(),
    initial: z.number().int().nonnegative(),
  }).optional(),
  sourceNotes: z.array(z.string()).optional(),
});

export const cardDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['coordination', 'event']),
  description: z.string().min(1),
  art: z.string().optional(),
  target: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('none') }),
    z.object({ kind: z.literal('member'), relation: z.enum(['ally', 'enemy']), skillPicker: z.boolean().optional() }),
    z.object({ kind: z.literal('work'), relation: z.enum(['ally', 'enemy']) }),
    z.object({ kind: z.literal('voiceMode') }),
  ]),
  effects: z.array(effectSchema).optional(),
  customHandler: z.string().optional(),
  ai: z.object({
    autoUse: z.boolean(),
    priority: z.number().int().default(0),
    when: z.enum(['always', 'enemyLowestHeadroom', 'allyStressAtLeast2']).default('always'),
  }).optional(),
});

export type SkillStat = z.infer<typeof skillStatSchema>;
export type WorkType = z.infer<typeof workTypeSchema>;
export type TeamId = z.infer<typeof teamIdSchema>;
export type NumberValue = z.infer<typeof numberValueSchema>;
export type MemberSelector = z.infer<typeof memberSelectorSchema>;
export type WorkSelector = z.infer<typeof workSelectorSchema>;
export type SkillEffect = z.infer<typeof effectSchema>;
export type SkillPassive = z.infer<typeof passiveSchema>;
export type SkillTrigger = z.infer<typeof triggerSchema>;
export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;
export type CharacterDefinition = z.infer<typeof characterDefinitionSchema>;
export type CardDefinition = z.infer<typeof cardDefinitionSchema>;
