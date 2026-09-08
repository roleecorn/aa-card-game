import { nanoid } from 'nanoid';
import { BASE_DECK, DEFAULT_CONTENT, DEFAULT_MATCH, WORK_TYPES } from '../content/catalog';
import { builtInEffects } from './effectRegistry';
import { executeCardHandler } from './cardHandlers';
import { SkillRuntime } from './skillRuntime';
import { chooseEnemyActions, runEnemyPreTurnAi } from './ai';
import type { CardDefinition, CharacterDefinition, MemberSelector, SkillEffect, SkillStat, TeamId, WorkSelector, WorkType } from './schema';
import type { GameContent } from './contentRegistry';
import type {
  ActionChoice,
  CharacterState,
  DieToken,
  DieValue,
  EffectContext,
  GameState,
  SkillActivationTarget,
  TeamState,
  WorkState,
} from './types';

function cloneStats(stats: CharacterDefinition['stats']): CharacterDefinition['stats'] {
  return { design: stats.design, text: stats.text, aa: stats.aa };
}

export interface InitialGameOptions {
  playerMemberIds?: string[];
  enemyMemberIds?: string[];
}

function isStandardPlayable(definition: CharacterDefinition): boolean {
  return !definition.tags?.includes('not-standard-playable');
}

function characterWorkTypes(definition: CharacterDefinition, content: GameContent): WorkType[] {
  const types = new Set<WorkType>(definition.affinities);
  let all = false;

  for (const skillId of definition.skillIds) {
    const skill = content.skills[skillId];
    for (const passive of skill?.passives ?? []) {
      if (passive.kind !== 'affinity.grant') continue;
      if (passive.types === 'all') all = true;
      else passive.types.forEach((type) => types.add(type));
    }
  }

  return all ? [...WORK_TYPES] : [...types];
}

function chooseWorkType(engine: EngineSession, memberId: string): WorkType {
  const definition = engine.content.characters[memberId];
  if (!definition) throw new Error(`Unknown character ${memberId}`);
  const candidates = characterWorkTypes(definition, engine.content);
  if (!candidates.length) return '謀';
  return candidates[Math.floor(engine.random() * candidates.length)] ?? candidates[0] ?? '謀';
}

function validateRosterOverride(
  content: GameContent,
  playerMemberIds: string[],
  enemyMemberIds: string[],
  teamSize: number,
): void {
  if (playerMemberIds.length !== teamSize || enemyMemberIds.length !== teamSize) {
    throw new Error(`Each standard team must contain exactly ${teamSize} characters.`);
  }
  const combined = [...playerMemberIds, ...enemyMemberIds];
  if (new Set(combined).size !== combined.length) throw new Error('Player and enemy rosters must not contain duplicate characters.');
  for (const id of combined) {
    const definition = content.characters[id];
    if (!definition) throw new Error(`Unknown character ${id}`);
    if (!isStandardPlayable(definition)) throw new Error(`Character ${id} is not available in a standard match.`);
  }
}

export function selectStandardRosters(
  rng: () => number = Math.random,
  content: GameContent = DEFAULT_CONTENT,
): { playerMemberIds: string[]; enemyMemberIds: string[]; unusedMemberIds: string[] } {
  const playable = Object.values(content.characters)
    .filter(isStandardPlayable)
    .map((character) => character.id);

  const required = DEFAULT_MATCH.teamSize * 2;
  if (playable.length < required) {
    throw new Error(`Standard match requires at least ${required} playable characters; found ${playable.length}.`);
  }

  const bootstrap = new EngineSession({} as GameState, rng, content);
  const shuffled = bootstrap.shuffle(playable);
  return {
    playerMemberIds: shuffled.slice(0, DEFAULT_MATCH.teamSize),
    enemyMemberIds: shuffled.slice(DEFAULT_MATCH.teamSize, required),
    unusedMemberIds: shuffled.slice(required),
  };
}

export class EngineSession {
  readonly skills: SkillRuntime;

  constructor(
    public readonly state: GameState,
    readonly rng: () => number = Math.random,
    public readonly content: GameContent = DEFAULT_CONTENT,
  ) {
    this.skills = new SkillRuntime(this);
  }

  uid(prefix: string): string {
    return `${prefix}-${nanoid(8)}`;
  }

  random(): number {
    return this.rng();
  }

  randomDie(min = 1): DieValue {
    const rolled = 1 + Math.floor(this.rng() * 6);
    return this.asDieValue(Math.max(min, rolled));
  }

  asDieValue(value: number): DieValue {
    return Math.max(1, Math.min(6, Math.round(value))) as DieValue;
  }

  opponentId(teamId: TeamId): TeamId {
    return teamId === 'player' ? 'enemy' : 'player';
  }

  getTeam(teamId: TeamId): TeamState {
    return teamId === 'player' ? this.state.player : this.state.enemy;
  }

  getCharacter(teamId: TeamId, memberId: string): CharacterState | undefined {
    return this.getTeam(teamId).members.find((member) => member.defId === memberId);
  }

  findMemberTeam(memberId: string): TeamId | undefined {
    if (this.state.player.members.some((member) => member.defId === memberId)) return 'player';
    if (this.state.enemy.members.some((member) => member.defId === memberId)) return 'enemy';
    return undefined;
  }

  getDefinition(memberId: string): CharacterDefinition {
    const definition = this.content.characters[memberId];
    if (!definition) throw new Error(`Missing character definition ${memberId}`);
    return definition;
  }

  getCharacterSkills(memberId: string) {
    return this.getDefinition(memberId).skillIds.map((id) => this.content.skills[id]).filter((skill) => !!skill);
  }

  getEffectiveStat(memberId: string, skill: SkillStat): number {
    const teamId = this.findMemberTeam(memberId);
    const member = teamId ? this.getCharacter(teamId, memberId) : undefined;
    if (!member) return 0;
    return Math.max(0, member.permanentStats[skill] + member.timedStatModifiers
      .filter((modifier) => modifier.skill === skill)
      .reduce((sum, modifier) => sum + modifier.amount, 0));
  }

  getEffectiveAffinity(memberId: string): WorkType[] | 'all' {
    const definition = this.getDefinition(memberId);
    return this.skills.getAffinity(memberId, definition.affinities);
  }

  scoreWork(work: WorkState): number {
    return work.slots.reduce((sum, slot) => sum + Math.min(slot.design ?? -2, slot.text ?? -2, slot.aa ?? -2), 0);
  }

  scoreTeam(teamId: TeamId): number {
    return this.getTeam(teamId).works.reduce((sum, work) => sum + this.scoreWork(work), 0);
  }

  log(text: string): void {
    this.state.logs.push({ id: this.uid('log'), round: this.state.round, text });
    if (this.state.logs.length > 150) this.state.logs.shift();
  }

  start(): void {
    this.skills.emit({ type: 'gameStart' });
    this.skills.emit({ type: 'roundStart' });
  }

  rollDieFor(memberId: string, explicitFloor?: number): DieValue {
    return this.randomDie(this.skills.getRollFloor(memberId, explicitFloor ?? 1));
  }

  grantDice(teamId: TeamId, memberId: string, skill: SkillStat, count: number, origin: string, extra: boolean, explicitFloor?: number): DieToken[] {
    const team = this.getTeam(teamId);
    if (!team.members.some((member) => member.defId === memberId) || count <= 0) return [];
    const dice = Array.from({ length: count }, (): DieToken => ({
      id: this.uid('die'),
      ownerId: memberId,
      skill,
      value: this.rollDieFor(memberId, explicitFloor),
      round: this.state.round,
      origin,
    }));
    team.pendingDice.push(...dice);
    this.log(`${this.getDefinition(memberId).name} 因「${origin}」獲得 ${count} 顆 ${skill.toUpperCase()} 骰。`);
    this.skills.emit({
      type: 'afterDiceGranted',
      teamId,
      targetId: memberId,
      skill,
      amount: count,
      dice,
      sourceKind: 'skill-or-card',
      metadata: { extra },
    });
    return dice;
  }

  adjustStress(teamId: TeamId, memberId: string, amount: number, source: string, external = false, sourceId?: string): void {
    const member = this.getCharacter(teamId, memberId);
    if (!member || amount === 0) return;
    let actual = amount;
    if (external && amount > 0) {
      const event = this.skills.emit({ type: 'beforeExternalStress', teamId, targetId: memberId, sourceId, sourceKind: source, amount });
      if (event.cancelled) return;
      actual = event.amount ?? amount;
    }
    const before = member.stress;
    member.stress = Math.max(0, member.stress + actual);
    const delta = member.stress - before;
    if (delta !== 0) this.log(`${this.getDefinition(memberId).name} 因「${source}」壓力 ${delta > 0 ? '+' : ''}${delta}。`);
    if (external && amount > 0) {
      this.skills.emit({ type: 'afterExternalStress', teamId, targetId: memberId, sourceId, sourceKind: source, amount: delta });
    }
    const maxStress = this.getDefinition(memberId).maxStress;
    if (maxStress !== null && member.stress > maxStress) {
      const team = this.getTeam(teamId);
      const beforeDice = team.pendingDice.length;
      team.pendingDice = team.pendingDice.filter((die) => die.ownerId !== memberId);
      if (team.pendingDice.length !== beforeDice) this.log(`${this.getDefinition(memberId).name} 壓力爆表，失去尚未分配的骰。`);
    }
  }

  resizeWork(work: WorkState, amount: number, min = 1): void {
    const next = Math.max(min, work.length + amount);
    if (next > work.length) work.slots.push(...Array.from({ length: next - work.length }, () => ({})));
    else if (next < work.length) work.slots.splice(next);
    work.length = next;
  }

  resolveMembers(selector: MemberSelector, context: EffectContext): Array<{ teamId: TeamId; member: CharacterState }> {
    const one = (id?: string): Array<{ teamId: TeamId; member: CharacterState }> => {
      if (!id) return [];
      const teamId = this.findMemberTeam(id);
      const member = teamId ? this.getCharacter(teamId, id) : undefined;
      return teamId && member ? [{ teamId, member }] : [];
    };
    const allies = this.getTeam(context.ownerTeamId).members.map((member) => ({ teamId: context.ownerTeamId, member }));
    const enemiesId = this.opponentId(context.ownerTeamId);
    const enemies = this.getTeam(enemiesId).members.map((member) => ({ teamId: enemiesId, member }));
    const pickRandom = <T,>(items: T[]): T[] => items.length ? [items[Math.floor(this.random() * items.length)]!] : [];
    const pickStress = (items: Array<{ teamId: TeamId; member: CharacterState }>, direction: 'highest' | 'lowest') => {
      if (!items.length) return [];
      return [[...items].sort((a, b) => direction === 'highest' ? b.member.stress - a.member.stress : a.member.stress - b.member.stress)[0]!];
    };

    switch (selector) {
      case 'owner': return one(context.ownerId);
      case 'eventActor': return one(context.event.actorId);
      case 'eventTarget': return one(context.event.targetId);
      case 'eventSource': return one(context.event.sourceId);
      case 'selectedMember': return one(context.activationTarget?.memberId);
      case 'selectedWorkOwner': return one(this.findWork(context.activationTarget?.workId)?.ownerId);
      case 'teamLeader': return one(this.getTeam(context.ownerTeamId).leaderId);
      case 'allAllies': return allies;
      case 'otherAllies': return allies.filter(({ member }) => member.defId !== context.ownerId);
      case 'allEnemies': return enemies;
      case 'randomAlly': return pickRandom(allies);
      case 'randomOtherAlly': return pickRandom(allies.filter(({ member }) => member.defId !== context.ownerId));
      case 'randomEnemy': return pickRandom(enemies);
      case 'highestStressAlly': return pickStress(allies, 'highest');
      case 'lowestStressAlly': return pickStress(allies, 'lowest');
      case 'highestStressEnemy': return pickStress(enemies, 'highest');
      case 'lowestStressEnemy': return pickStress(enemies, 'lowest');
    }
  }

  resolveWorks(selector: WorkSelector, context: EffectContext): WorkState[] {
    const allies = this.getTeam(context.ownerTeamId).works;
    const enemies = this.getTeam(this.opponentId(context.ownerTeamId)).works;
    const pickRandom = (items: WorkState[]): WorkState[] => items.length ? [items[Math.floor(this.random() * items.length)]!] : [];
    const pickScore = (items: WorkState[], direction: 'highest' | 'lowest'): WorkState[] => {
      if (!items.length) return [];
      return [[...items].sort((a, b) => direction === 'highest' ? this.scoreWork(b) - this.scoreWork(a) : this.scoreWork(a) - this.scoreWork(b))[0]!];
    };

    switch (selector) {
      case 'ownerWork': return allies.filter((work) => work.ownerId === context.ownerId);
      case 'eventWork': return this.findWork(context.event.workId) ? [this.findWork(context.event.workId)!] : [];
      case 'selectedWork': return this.findWork(context.activationTarget?.workId) ? [this.findWork(context.activationTarget?.workId)!] : [];
      case 'allAllyWorks': return allies;
      case 'allEnemyWorks': return enemies;
      case 'randomAllyWork': return pickRandom(allies);
      case 'randomEnemyWork': return pickRandom(enemies);
      case 'lowestScoreAllyWork': return pickScore(allies, 'lowest');
      case 'highestScoreAllyWork': return pickScore(allies, 'highest');
      case 'lowestScoreEnemyWork': return pickScore(enemies, 'lowest');
      case 'highestScoreEnemyWork': return pickScore(enemies, 'highest');
    }
  }

  private findWork(workId?: string): WorkState | undefined {
    if (!workId) return undefined;
    return [...this.state.player.works, ...this.state.enemy.works].find((work) => work.id === workId);
  }

  applyEffects(effects: SkillEffect[], context: EffectContext): boolean {
    let applied = false;
    for (const effect of effects) {
      applied = builtInEffects.execute(effect, context, this) || applied;
      if (context.event.cancelled) break;
    }
    return applied;
  }

  drawCards(teamId: TeamId, count: number): void {
    const team = this.getTeam(teamId);
    for (let i = 0; i < count; i += 1) {
      if (team.deck.length === 0) {
        team.deck = this.shuffle(team.discard);
        team.discard = [];
      }
      const cardId = team.deck.shift();
      if (!cardId) return;
      team.hand.push({ instanceId: this.uid('card'), cardId });
    }
  }

  addCard(teamId: TeamId, cardId: string, count: number): void {
    const team = this.getTeam(teamId);
    for (let i = 0; i < count; i += 1) team.hand.push({ instanceId: this.uid('card'), cardId });
  }

  canPlaceDie(teamId: TeamId, die: DieToken, work: WorkState, slotIndex: number): boolean {
    const team = this.getTeam(teamId);
    if (!team.pendingDice.some((candidate) => candidate.id === die.id)) return false;
    if (!team.works.some((candidate) => candidate.id === work.id)) return false;
    if (slotIndex < 0 || slotIndex >= work.slots.length) return false;
    if (die.skill !== 'aa' && work.ownerId !== die.ownerId) {
      const affinity = this.getEffectiveAffinity(die.ownerId);
      if (affinity !== 'all' && !affinity.includes(work.type)) return false;
    }
    const slot = work.slots[slotIndex];
    if (!slot) return false;
    if (die.skill === 'text' && slot.design === undefined) return false;
    if (die.skill === 'aa' && slot.text === undefined) return false;
    return true;
  }

  placeDie(teamId: TeamId, dieId: string, workId: string, slotIndex: number): boolean {
    const team = this.getTeam(teamId);
    const die = team.pendingDice.find((candidate) => candidate.id === dieId);
    const work = team.works.find((candidate) => candidate.id === workId);
    if (!die || !work || !this.canPlaceDie(teamId, die, work, slotIndex)) return false;
    const slot = work.slots[slotIndex];
    if (!slot) return false;
    const existing = slot[die.skill] ?? 0;
    if (existing >= die.value) return false;
    slot[die.skill] = die.value;
    team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== dieId);
    this.log(`${this.getDefinition(die.ownerId).name} 將 ${die.skill.toUpperCase()} ${die.value} 放入「${work.title}」第 ${slotIndex + 1} 格。`);
    this.skills.emit({ type: 'afterDiePlaced', teamId, actorId: die.ownerId, dieId: die.id, skill: die.skill, workId: work.id, amount: die.value });
    return true;
  }

  performPlayerActions(actions: Record<string, ActionChoice>): void {
    if (this.state.phase !== 'player-plan') return;
    this.performTeamActions('player', actions);
    this.state.phase = 'player-assign';
  }

  private performTeamActions(teamId: TeamId, actions: Record<string, ActionChoice>): void {
    const team = this.getTeam(teamId);
    for (const member of team.members) {
      const definition = this.getDefinition(member.defId);
      const mustSlack = definition.maxStress !== null && member.stress >= definition.maxStress;
      const action = mustSlack ? 'slack' : actions[member.defId] ?? 'work';
      if (action === 'slack') {
        this.adjustStress(teamId, member.defId, -2, '摸魚');
        continue;
      }

      const batch: DieToken[] = [];
      for (const skill of ['design', 'text', 'aa'] as const) {
        for (let i = 0; i < this.getEffectiveStat(member.defId, skill); i += 1) {
          batch.push({ id: this.uid('die'), ownerId: member.defId, skill, value: this.rollDieFor(member.defId), round: this.state.round, origin: '工作' });
        }
      }
      this.skills.emit({ type: 'afterRollBatch', teamId, actorId: member.defId, dice: batch, amount: batch.length, sourceKind: 'work' });

      if ((member.statuses.writerBlock?.stacks ?? 0) > 0 && batch.some((die) => die.value <= 2)) {
        delete member.statuses.writerBlock;
        this.adjustStress(teamId, member.defId, 2, '卡文', true);
      }

      this.adjustStress(teamId, member.defId, 1, '工作');
      this.log(`${definition.name} 工作，產生 ${batch.length} 顆骰。`);
      if (definition.maxStress !== null && member.stress > definition.maxStress) {
        this.log(`${definition.name} 壓力超過上限，本回合剛擲出的骰全部歸零。`);
      } else {
        team.pendingDice.push(...batch);
      }
    }
  }

  playCard(teamId: TeamId, instanceId: string, target: SkillActivationTarget): boolean {
    const team = this.getTeam(teamId);
    const index = team.hand.findIndex((card) => card.instanceId === instanceId);
    const instance = team.hand[index];
    if (!instance) return false;
    const card = this.content.cards[instance.cardId];
    if (!card || !this.validateCardTarget(teamId, card, target)) return false;

    let success = false;
    if (card.effects?.length) {
      const context: EffectContext = {
        ownerId: team.leaderId,
        ownerTeamId: teamId,
        definition: card,
        event: { type: 'cardPlayed', teamId, sourceKind: card.kind, metadata: { cardId: card.id } },
        activationTarget: target,
      };
      success = this.applyEffects(card.effects, context);
    }
    if (card.customHandler) success = executeCardHandler(card.customHandler, team, card, target, this) || success;
    if (!success) return false;

    team.hand.splice(index, 1);
    team.discard.push(card.id);
    this.log(`${team.name} 使用「${card.name}」。`);
    if (card.kind === 'coordination' && team.leaderId) this.adjustStress(teamId, team.leaderId, 1, '使用統籌卡', true);
    this.skills.emit({ type: 'cardPlayed', teamId, sourceKind: card.kind, metadata: { cardId: card.id } });
    return true;
  }

  activateSkill(teamId: TeamId, memberId: string, skillId: string, target: SkillActivationTarget = {}): boolean {
    if (this.state.phase === 'finished') return false;
    return this.skills.activate(teamId, memberId, skillId, target);
  }

  canUseActiveSkill(memberId: string, skillId: string): boolean {
    return this.skills.canUseActive(memberId, skillId);
  }

  finishPlayerAssignment(): void {
    if (this.state.phase !== 'player-assign') return;
    if (this.state.player.pendingDice.length) {
      this.log(`你放棄了 ${this.state.player.pendingDice.length} 顆未分配骰。`);
      this.state.player.pendingDice = [];
    }
    this.runEnemyTurn();
    this.advanceRound();
  }

  private runEnemyTurn(): void {
    runEnemyPreTurnAi(this);
    this.performTeamActions('enemy', chooseEnemyActions(this));
    this.autoAssign('enemy');
    this.state.enemy.pendingDice = [];
  }

  private autoAssign(teamId: TeamId): void {
    const team = this.getTeam(teamId);
    for (const die of [...team.pendingDice].sort((a, b) => b.value - a.value)) {
      const legal = team.works.flatMap((work) => work.slots.flatMap((slot, slotIndex) =>
        this.canPlaceDie(teamId, die, work, slotIndex)
          ? [{ work, slotIndex, existing: slot[die.skill] ?? 0 }]
          : []));
      legal.sort((a, b) => a.existing - b.existing || Number(a.work.ownerId !== die.ownerId) - Number(b.work.ownerId !== die.ownerId));
      const target = legal.find((item) => item.existing < die.value);
      if (target) this.placeDie(teamId, die.id, target.work.id, target.slotIndex);
    }
  }

  private advanceRound(): void {
    this.skills.emit({ type: 'roundEnd' });
    if (this.state.round >= this.state.maxRounds) {
      const playerScore = this.scoreTeam('player');
      const enemyScore = this.scoreTeam('enemy');
      this.state.phase = 'finished';
      this.state.winner = playerScore === enemyScore ? 'draw' : playerScore > enemyScore ? 'player' : 'enemy';
      this.log(`遊戲結束：你 ${playerScore} 分，對手 ${enemyScore} 分。`);
      return;
    }
    this.cleanupRoundScopedState();
    this.state.round += 1;
    this.state.phase = 'player-plan';
    this.drawCards('player', 1);
    this.drawCards('enemy', 1);
    this.log(`進入第 ${this.state.round} 回合。`);
    this.skills.emit({ type: 'roundStart' });
  }

  private cleanupRoundScopedState(): void {
    for (const team of [this.state.player, this.state.enemy]) {
      for (const member of team.members) {
        member.timedStatModifiers = member.timedStatModifiers.filter((modifier) => modifier.expiresAfterRound > this.state.round);
        for (const [status, value] of Object.entries(member.statuses)) {
          if (value.expiresAfterRound !== undefined && value.expiresAfterRound <= this.state.round) delete member.statuses[status];
        }
      }
    }
  }

  private validateCardTarget(teamId: TeamId, card: CardDefinition, target: SkillActivationTarget): boolean {
    if (card.target.kind === 'none' || card.target.kind === 'voiceMode') return true;
    if (card.target.kind === 'member') {
      if (!target.memberId) return false;
      const targetTeam = this.findMemberTeam(target.memberId);
      if (!targetTeam) return false;
      if (card.target.skillPicker && !target.skill) return false;
      return card.target.relation === 'ally' ? targetTeam === teamId : targetTeam !== teamId;
    }
    if (!target.workId) return false;
    const ownerTeam = this.getTeam(teamId).works.some((work) => work.id === target.workId) ? teamId : this.opponentId(teamId);
    return card.target.relation === 'ally' ? ownerTeam === teamId : ownerTeam !== teamId;
  }

  shuffle<T>(input: T[]): T[] {
    const output = [...input];
    for (let i = output.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      [output[i], output[j]] = [output[j]!, output[i]!];
    }
    return output;
  }
}

function createTeam(engine: EngineSession, id: TeamId, name: string, memberIds: string[]): TeamState {
  const members: CharacterState[] = memberIds.map((defId) => {
    const definition = engine.content.characters[defId];
    if (!definition) throw new Error(`Unknown character ${defId}`);
    return {
      defId,
      stress: 0,
      permanentStats: cloneStats(definition.stats),
      timedStatModifiers: [],
      skillUsage: {},
      statuses: {},
    };
  });
  const works: WorkState[] = memberIds.map((ownerId) => ({
    id: engine.uid('work'),
    ownerId,
    title: `${engine.content.characters[ownerId]?.name ?? ownerId} 的作品`,
    type: chooseWorkType(engine, ownerId),
    length: 5,
    slots: Array.from({ length: 5 }, () => ({})),
  }));
  return {
    id,
    name,
    leaderId: memberIds[0] ?? '',
    members,
    works,
    hand: [],
    deck: engine.shuffle(BASE_DECK),
    discard: [],
    pendingDice: [],
  };
}

export function createInitialGame(
  rng: () => number = Math.random,
  content: GameContent = DEFAULT_CONTENT,
  options: InitialGameOptions = {},
): GameState {
  const placeholder = {} as GameState;
  const bootstrap = new EngineSession(placeholder, rng, content);

  let playerMemberIds: string[];
  let enemyMemberIds: string[];

  if (options.playerMemberIds || options.enemyMemberIds) {
    if (!options.playerMemberIds || !options.enemyMemberIds) {
      throw new Error('Both playerMemberIds and enemyMemberIds must be provided together.');
    }
    validateRosterOverride(content, options.playerMemberIds, options.enemyMemberIds, DEFAULT_MATCH.teamSize);
    playerMemberIds = [...options.playerMemberIds];
    enemyMemberIds = [...options.enemyMemberIds];
  } else {
    const selected = selectStandardRosters(rng, content);
    playerMemberIds = selected.playerMemberIds;
    enemyMemberIds = selected.enemyMemberIds;
  }

  const player = createTeam(bootstrap, 'player', DEFAULT_MATCH.player.name, playerMemberIds);
  const enemy = createTeam(bootstrap, 'enemy', DEFAULT_MATCH.enemy.name, enemyMemberIds);
  const state: GameState = { round: 1, maxRounds: DEFAULT_MATCH.maxRounds, phase: 'player-plan', player, enemy, logs: [] };
  const engine = new EngineSession(state, rng, content);
  engine.drawCards('player', 4);
  engine.drawCards('enemy', 4);
  engine.log(`本局隨機隊伍：我方 ${playerMemberIds.map((id) => content.characters[id]?.name ?? id).join('、')}；對手 ${enemyMemberIds.map((id) => content.characters[id]?.name ?? id).join('、')}。`);
  engine.log('遊戲開始：5 回合內完成作品；每個 slot 以 Design / Text / AA 的最低值計分，缺項視為 -2。');
  engine.start();
  return state;
}
