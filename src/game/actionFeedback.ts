import type { EngineSession } from './engine';
import type { EffectContext, GameState } from './types';
import type { TeamId } from './schema';

export type FeedbackTone = 'positive' | 'negative' | 'neutral';
export interface FeedbackImpact {
  anchor: string;
  fallbackAnchor?: string;
  target: string;
  part: string;
  before: number | string;
  after: number | string;
  tone: FeedbackTone;
}
export interface ActionFeedback {
  id: number;
  round: number;
  teamId: TeamId;
  actorId: string;
  actor: string;
  name: string;
  kind: 'skill' | 'card';
  incomplete?: boolean;
  impacts: FeedbackImpact[];
}
type Reading = Omit<FeedbackImpact, 'before' | 'after' | 'tone'> & { value: number | string; good: number };
type Snapshot = Map<string, Reading>;

// Pure observation: never consumes RNG or calls effect/condition handlers.
function snapshot(engine: EngineSession, context: EffectContext): Snapshot {
  const result: Snapshot = new Map();
  const add = (anchor: string, target: string, part: string, value: number | string, good = 0, fallbackAnchor?: string) => {
    result.set(`${anchor}/${part}`, { anchor, fallbackAnchor, target, part, value, good });
  };
  for (const teamId of ['player', 'enemy'] as const) {
    const team = engine.state[teamId];
    const side = teamId === 'player' ? '我方' : '對手';
    add(`hand:${teamId}`, side, '手牌', team.hand.length, 1);
    for (const member of team.members) {
      const anchor = `member:${member.defId}`;
      const name = `${side} ${engine.getDefinition(member.defId).name}`;
      add(anchor, name, '在場', 1, 1);
      add(anchor, name, '壓力', member.stress, -1);
      for (const stat of ['design', 'text', 'aa'] as const) {
        add(anchor, name, stat.toUpperCase(), engine.getEffectiveStat(member.defId, stat), 1);
      }
      for (const [key, value] of Object.entries(member.resources ?? {})) add(anchor, name, key, value);
      const labels: Record<string, [string, number]> = {
        'stress-immune': ['壓力免疫', 1], 'action-blocked': ['禁止行動', -1],
        'coordination-untargetable': ['統籌卡免疫', 1], 'coordination-disabled-as-leader': ['禁止統籌卡', -1],
        'leader-stress-cap-bonus': ['壓力上限加成', 1],
        writerBlock: ['卡文（低骰時壓力 +2）', -1],
      };
      for (const [key, value] of Object.entries(member.statuses)) {
        const [label, good] = labels[key] ?? ['特殊狀態', 0];
        add(anchor, name, label === '特殊狀態' ? `${context.definition.name} · 特殊狀態` : label, value.stacks, good);
      }
    }
    for (const die of team.pendingDice) add(`die:${die.id}`, `${side} ${engine.getDefinition(die.ownerId).name}`, `${die.skill.toUpperCase()} 骰`, die.value, 1, `member:${die.ownerId}`);
    for (const work of team.works) {
      const anchor = `work:${work.id}`;
      const name = `${side}「${work.title}」`;
      add(anchor, name, '類型', work.type, 0, `member:${work.ownerId}`);
      add(anchor, name, '篇幅', work.length, 0, `member:${work.ownerId}`);
      work.slots.forEach((slot, index) => {
        for (const stat of ['design', 'text', 'aa'] as const) add(anchor, name, `第 ${index + 1} 格 ${stat.toUpperCase()}`, slot[stat] ?? 0, 1, `member:${work.ownerId}`);
      });
    }
  }
  const event = context.event;
  const memberId = event.targetId ?? event.actorId ?? context.ownerId;
  const target = engine.content.characters[memberId]?.name ?? memberId;
  if (event.amount !== undefined) add(`member:${memberId}`, target,
    event.type === 'beforeExternalStress' ? '待承受的外部壓力' : '待結算數值', event.amount,
    event.type === 'beforeExternalStress' ? -1 : 0);
  add(`member:${memberId}`, target, '效果攔截', event.cancelled ? 1 : 0, event.type === 'beforeExternalStress' ? 1 : 0);
  for (const die of event.dice ?? []) add(`die:${die.id}`, engine.getDefinition(die.ownerId).name, `${die.skill.toUpperCase()} 骰`, die.value, 1, `member:${die.ownerId}`);
  return result;
}

function difference(before: Snapshot, after: Snapshot): FeedbackImpact[] {
  const changes: FeedbackImpact[] = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(key), next = after.get(key), reading = next ?? old!;
    const a = old?.value ?? 0, b = next?.value ?? 0;
    if (a === b) continue;
    const direction = typeof a === 'number' && typeof b === 'number' ? (b - a) * reading.good : 0;
    changes.push({ anchor: reading.anchor, fallbackAnchor: reading.fallbackAnchor, target: reading.target, part: reading.part, before: a, after: b, tone: direction > 0 ? 'positive' : direction < 0 ? 'negative' : 'neutral' });
  }
  return changes;
}

interface Scope { context: EffectContext; before: Snapshot; entry: ActionFeedback }
export class FeedbackRecorder {
  private stack: Scope[] = [];
  constructor(private engine: EngineSession) {}

  private flush(scope: Scope) {
    const after = snapshot(this.engine, scope.context);
    scope.entry.impacts.push(...difference(scope.before, after));
    scope.before = after;
  }

  capture(context: EffectContext, kind: ActionFeedback['kind'], action: () => boolean): boolean {
    const parent = this.stack.at(-1);
    if (parent) this.flush(parent);
    const state: GameState = this.engine.state;
    const id = (state.feedbackSequence ?? 0) + 1;
    state.feedbackSequence = id;
    const entry: ActionFeedback = { id, round: state.round, teamId: context.ownerTeamId, actorId: context.ownerId,
      actor: this.engine.getDefinition(context.ownerId).name, name: context.definition.name, kind, impacts: [] };
    const scope = { context, before: snapshot(this.engine, context), entry };
    this.stack.push(scope);
    let success = false;
    try { success = action(); return success; }
    finally {
      this.flush(scope);
      this.stack.pop();
      if (parent) parent.before = snapshot(this.engine, parent.context);
      entry.incomplete = !success;
      const selected = context.activationTarget;
      const selectedAnchor = selected?.memberId ? `member:${selected.memberId}`
        : selected?.workId ? `work:${selected.workId}`
        : selected?.targetDieId ? `die:${selected.targetDieId}` : undefined;
      if (success && selectedAnchor && !entry.impacts.some(impact => impact.anchor === selectedAnchor)) {
        const reading = [...scope.before.values()].find(value => value.anchor === selectedAnchor);
        if (reading) entry.impacts.push({ anchor: selectedAnchor, fallbackAnchor: reading.fallbackAnchor,
          target: reading.target, part: '指定目標', before: '已結算', after: '無可見數值變化', tone: 'neutral' });
      }
      // Repeated automatic no-ops (e.g. an already converted work type) stay quiet.
      if (entry.impacts.length || (success && (kind === 'card' || context.event.type === 'activeSkill'))) {
        if (kind === 'card') {
          for (const impact of entry.impacts) {
            if (impact.anchor === `hand:${context.ownerTeamId}` && impact.part === '手牌' && Number(impact.before) - Number(impact.after) === 1) {
              impact.part = '手牌消耗';
              impact.tone = 'neutral';
            }
          }
        }
        state.feedback ??= [];
        state.feedback.push(entry);
        state.feedback.sort((a, b) => a.id - b.id);
        if (state.feedback.length > 100) state.feedback.splice(0, state.feedback.length - 100);
      }
    }
  }
}
