import type { CharacterDefinition, SkillDefinition, SkillStat, TeamId, WorkType } from './schema';

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type ActionChoice = 'work' | 'slack';
export type Phase = 'player-plan' | 'player-assign' | 'finished';

export interface ProgressSlot {
  design?: DieValue;
  text?: DieValue;
  aa?: DieValue;
}

export interface TimedStatModifier {
  id: string;
  skill: SkillStat;
  amount: number;
  expiresAfterRound: number;
}

export interface StatusInstance {
  stacks: number;
  expiresAfterRound?: number;
}

export interface CharacterState {
  defId: string;
  stress: number;
  permanentStats: CharacterDefinition['stats'];
  timedStatModifiers: TimedStatModifier[];
  skillUsage: Record<string, number>;
  statuses: Record<string, StatusInstance>;
  resources?: Record<string, number>;
}

export interface WorkState {
  id: string;
  ownerId: string;
  title: string;
  type: WorkType;
  length: number;
  slots: ProgressSlot[];
}

export interface DieToken {
  id: string;
  ownerId: string;
  skill: SkillStat;
  value: DieValue;
  round: number;
  origin: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface TeamState {
  id: TeamId;
  name: string;
  leaderId: string;
  members: CharacterState[];
  works: WorkState[];
  hand: CardInstance[];
  deck: string[];
  discard: string[];
  pendingDice: DieToken[];
}

export interface LogEntry {
  id: string;
  round: number;
  text: string;
}

export interface GameState {
  round: number;
  maxRounds: number;
  phase: Phase;
  player: TeamState;
  enemy: TeamState;
  logs: LogEntry[];
  winner?: TeamId | 'draw';
}

export interface SkillEvent {
  type: NonNullable<SkillDefinition['triggers']>[number]['event'] | 'activeSkill';
  teamId?: TeamId;
  actorId?: string;
  targetId?: string;
  sourceId?: string;
  sourceKind?: string;
  skill?: SkillStat;
  amount?: number;
  dice?: DieToken[];
  dieId?: string;
  workId?: string;
  cancelled?: boolean;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface SkillActivationTarget {
  memberId?: string;
  workId?: string;
  sourceDieId?: string;
  targetDieId?: string;
  skill?: SkillStat;
  voiceMode?: 'relief' | 'design' | 'text';
}

export interface EffectContext {
  ownerId: string;
  ownerTeamId: TeamId;
  definition: SkillDefinition | { id: string; name: string };
  event: SkillEvent;
  activationTarget?: SkillActivationTarget;
}
