import type { CardDefinition, SkillDefinition, TeamId } from './schema';
import type { CardInstance, DieToken, SkillActivationTarget, WorkState } from './types';
import type { EngineSession } from './engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from './statuses';
import { hasExternalEffectImmunity } from './externalImmunity';

export interface TargetLegality {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

export interface TargetCandidate extends TargetLegality {
  id: string;
}

export type SelectionStage = 'none' | 'member' | 'work' | 'sourceDie' | 'targetDie';

export interface SkillSelectionPlan {
  stage: SelectionStage;
  candidates: TargetCandidate[];
}

const allowed = (warning?: string): TargetLegality => ({ allowed: true, warning });
const blocked = (reason: string): TargetLegality => ({ allowed: false, reason });

function cardExternalWarning(engine: EngineSession, memberId: string): string | undefined {
  if (hasExternalEffectImmunity(engine, memberId)) {
    return '可指定，但「自己做」會使這張卡對此角色的效果無效。';
  }
  const teamId = engine.findMemberTeam(memberId);
  const member = teamId ? engine.getCharacter(teamId, memberId) : undefined;
  if (member && hasGameplayStatus(member, GAMEPLAY_STATUS.stressImmune)) {
    return '可指定，但此角色具有 Stress 免疫；Stress 變化不會生效。';
  }
  return undefined;
}

function skillExternalWarning(engine: EngineSession, ownerId: string, memberId: string): string | undefined {
  if (memberId !== ownerId && hasExternalEffectImmunity(engine, memberId)) {
    return '可指定，但「自己做」會使其他角色技能對此角色的效果無效。';
  }
  return undefined;
}

export function getDiePlacementLegality(
  engine: EngineSession,
  teamId: TeamId,
  die: DieToken,
  work: WorkState,
  slotIndex: number,
): TargetLegality {
  const team = engine.getTeam(teamId);
  if (!team.pendingDice.some((candidate) => candidate.id === die.id)) return blocked('這顆骰已不在待分配區。');
  if (!team.works.some((candidate) => candidate.id === work.id)) return blocked('只能投入自己隊伍的作品。');
  if (slotIndex < 0 || slotIndex >= work.slots.length) return blocked('這個進度格不存在。');

  if (die.placement !== 'anyAllyWork' && die.skill !== 'aa' && work.ownerId !== die.ownerId) {
    const affinity = engine.getEffectiveAffinity(die.ownerId);
    if (affinity !== 'all' && !affinity.includes(work.type)) {
      return blocked(`此角色沒有「${work.type}」作品適性。`);
    }
  }

  const slot = work.slots[slotIndex];
  if (!slot) return blocked('這個進度格不存在。');
  if (die.skill === 'text' && slot.design === undefined) return blocked('必須先放置 Design 骰。');
  if (die.skill === 'aa' && slot.text === undefined) return blocked('必須先放置 Text 骰。');

  const existing = slot[die.skill] ?? 0;
  if (existing >= die.value) {
    return blocked(`此格已有 ${die.skill.toUpperCase()} ${existing}，${die.value} 無法提升進度。`);
  }
  return allowed();
}

function memberMatchesCardRelation(engine: EngineSession, teamId: TeamId, card: CardDefinition, memberId: string): boolean {
  if (card.target.kind !== 'member') return false;
  const targetTeam = engine.findMemberTeam(memberId);
  if (!targetTeam) return false;
  return card.target.relation === 'ally' ? targetTeam === teamId : targetTeam !== teamId;
}

export function getGuideEligibleSkills(engine: EngineSession, memberId: string) {
  return (['design', 'text', 'aa'] as const).filter((skill) => engine.getEffectiveStat(memberId, skill) <= 1);
}

export function getCardMemberCandidates(engine: EngineSession, teamId: TeamId, card: CardDefinition): TargetCandidate[] {
  if (card.target.kind !== 'member') return [];
  return [...engine.state.player.members, ...engine.state.enemy.members].map((member): TargetCandidate => {
    if (!memberMatchesCardRelation(engine, teamId, card, member.defId)) {
      return { id: member.defId, ...blocked('這張卡不能指定此陣營的角色。') };
    }
    if (card.kind === 'coordination' && hasGameplayStatus(member, GAMEPLAY_STATUS.coordinationUntargetable)) {
      return { id: member.defId, ...blocked('此角色不能成為統籌卡目標。') };
    }

    const warning = cardExternalWarning(engine, member.defId);
    if (card.id === 'guide' && getGuideEligibleSkills(engine, member.defId).length === 0) {
      return { id: member.defId, ...blocked('此角色沒有 0 或 1 的能力可供「指導」。') };
    }
    if (card.id === 'soothe' && member.stress <= 0 && !warning) {
      return { id: member.defId, ...blocked('此角色目前沒有 Stress 可降低。') };
    }
    return { id: member.defId, ...allowed(warning) };
  });
}

function workMatchesCardRelation(engine: EngineSession, teamId: TeamId, card: CardDefinition, workId: string): boolean {
  if (card.target.kind !== 'work') return false;
  const isAlly = engine.getTeam(teamId).works.some((work) => work.id === workId);
  return card.target.relation === 'ally' ? isAlly : !isAlly;
}

function workHasProgress(work: WorkState): boolean {
  return work.slots.some((slot) => slot.design !== undefined || slot.text !== undefined || slot.aa !== undefined);
}

function workHasEmptyProgress(work: WorkState): boolean {
  return work.slots.some((slot) => slot.design === undefined || slot.text === undefined || slot.aa === undefined);
}

export function getCardWorkCandidates(engine: EngineSession, teamId: TeamId, card: CardDefinition): TargetCandidate[] {
  if (card.target.kind !== 'work') return [];
  return [...engine.state.player.works, ...engine.state.enemy.works].map((work): TargetCandidate => {
    if (!workMatchesCardRelation(engine, teamId, card, work.id)) {
      return { id: work.id, ...blocked('這張卡不能指定此陣營的作品。') };
    }
    if (card.id === 'polish' && !workHasProgress(work)) {
      return { id: work.id, ...blocked('作品中還沒有可重擲的既有骰。') };
    }
    if (card.id === 'rush' && !workHasEmptyProgress(work)) {
      return { id: work.id, ...blocked('作品已經填滿，沒有可填入的空位。') };
    }
    const warning = hasExternalEffectImmunity(engine, work.ownerId)
      ? '可指定，但作品負責人的「自己做」可能使卡牌效果無效。'
      : undefined;
    return { id: work.id, ...allowed(warning) };
  });
}

export function getCardAvailability(
  engine: EngineSession,
  teamId: TeamId,
  instance: CardInstance,
): TargetLegality {
  if (engine.state.phase === 'finished') return blocked('遊戲已結束。');
  const team = engine.getTeam(teamId);
  if (team.hand.length > engine.gameDefinition.rules.handLimit) return blocked('請先處理超過上限的手牌。');
  if (!team.hand.some((card) => card.instanceId === instance.instanceId)) return blocked('這張牌已不在手牌中。');
  const card = engine.content.cards[instance.cardId];
  if (!card) return blocked('找不到卡牌資料。');
  const leader = team.leaderId ? engine.getCharacter(teamId, team.leaderId) : undefined;
  if (!leader) return blocked('目前沒有可使用卡牌的組長。');
  if (card.kind === 'coordination' && hasGameplayStatus(leader, GAMEPLAY_STATUS.coordinationDisabledAsLeader)) {
    return blocked('目前組長不能使用統籌卡。');
  }
  if (card.target.kind === 'none' || card.target.kind === 'voiceMode') return allowed();
  if (card.target.kind === 'member') {
    return getCardMemberCandidates(engine, teamId, card).some((candidate) => candidate.allowed)
      ? allowed()
      : blocked('目前沒有可指定的角色。');
  }
  return getCardWorkCandidates(engine, teamId, card).some((candidate) => candidate.allowed)
    ? allowed()
    : blocked('目前沒有可指定的作品。');
}

function memberCandidateForSkill(
  engine: EngineSession,
  ownerId: string,
  skill: SkillDefinition,
  memberId: string,
): TargetCandidate {
  const spec = skill.activeTarget;
  if (!spec || (spec.kind !== 'member' && spec.kind !== 'taggedMember')) {
    return { id: memberId, ...blocked('此技能不指定角色。') };
  }
  const ownerTeam = engine.findMemberTeam(ownerId);
  const targetTeam = engine.findMemberTeam(memberId);
  if (!ownerTeam || !targetTeam) return { id: memberId, ...blocked('找不到角色。') };

  if (spec.kind === 'member') {
    const relationOk = spec.relation === 'enemy'
      ? targetTeam !== ownerTeam
      : spec.relation === 'otherAlly'
        ? targetTeam === ownerTeam && memberId !== ownerId
        : targetTeam === ownerTeam;
    if (!relationOk) return { id: memberId, ...blocked('此角色不符合技能的陣營條件。') };
  } else {
    if (spec.excludeSelf && memberId === ownerId) return { id: memberId, ...blocked('此技能不能指定自己。') };
    if (!(engine.getDefinition(memberId).tags?.includes(spec.tag) ?? false)) {
      return { id: memberId, ...blocked(`此角色沒有「${spec.tag}」條件。`) };
    }
  }
  return { id: memberId, ...allowed(skillExternalWarning(engine, ownerId, memberId)) };
}

function dieMatchesPendingSpec(
  engine: EngineSession,
  ownerId: string,
  skill: SkillDefinition,
  die: DieToken,
): TargetLegality {
  const spec = skill.activeTarget;
  if (!spec || spec.kind !== 'pendingDie') return blocked('此技能不指定骰子。');
  const ownerTeam = engine.findMemberTeam(ownerId);
  const dieTeam = engine.findMemberTeam(die.ownerId);
  if (!ownerTeam || !dieTeam) return blocked('找不到骰子持有者。');

  const relationOk = spec.relation === 'enemy'
    ? dieTeam !== ownerTeam
    : spec.relation === 'self'
      ? dieTeam === ownerTeam && die.ownerId === ownerId
      : spec.relation === 'otherAlly'
        ? dieTeam === ownerTeam && die.ownerId !== ownerId
        : dieTeam === ownerTeam;
  if (!relationOk) return blocked('這顆骰不符合技能的角色關係。');
  if (spec.skill && die.skill !== spec.skill) return blocked(`此技能只能指定 ${spec.skill.toUpperCase()} 骰。`);
  if (spec.minValue !== undefined && die.value < spec.minValue) return blocked(`骰值必須至少為 ${spec.minValue}。`);
  if (spec.maxValue !== undefined && die.value > spec.maxValue) return blocked(`骰值必須至多為 ${spec.maxValue}。`);
  return allowed(skillExternalWarning(engine, ownerId, die.ownerId));
}

export function getSkillSelectionPlan(
  engine: EngineSession,
  ownerId: string,
  skillId: string,
  partialTarget: SkillActivationTarget = {},
): SkillSelectionPlan {
  const skill = engine.content.skills[skillId];
  const teamId = engine.findMemberTeam(ownerId);
  if (!skill || !teamId) return { stage: 'none', candidates: [] };
  const spec = skill.activeTarget ?? { kind: 'none' as const };

  if (spec.kind === 'none') return { stage: 'none', candidates: [] };
  if (spec.kind === 'member' || spec.kind === 'taggedMember') {
    return {
      stage: 'member',
      candidates: [...engine.state.player.members, ...engine.state.enemy.members]
        .map((member) => memberCandidateForSkill(engine, ownerId, skill, member.defId)),
    };
  }
  if (spec.kind === 'work') {
    const ownTeam = engine.getTeam(teamId);
    const enemyTeam = engine.getTeam(engine.opponentId(teamId));
    return {
      stage: 'work',
      candidates: [...ownTeam.works, ...enemyTeam.works].map((work): TargetCandidate => {
        const isOwnTeam = ownTeam.works.some((candidate) => candidate.id === work.id);
        const ok = spec.relation === 'owner'
          ? isOwnTeam && work.ownerId === ownerId
          : spec.relation === 'ally'
            ? isOwnTeam
            : !isOwnTeam;
        return { id: work.id, ...(ok ? allowed() : blocked('此作品不符合技能的目標條件。')) };
      }),
    };
  }
  if (spec.kind === 'copyPendingDie') {
    const team = engine.getTeam(teamId);
    if (!partialTarget.sourceDieId) {
      return {
        stage: 'sourceDie',
        candidates: team.pendingDice.map((die): TargetCandidate => {
          if (die.ownerId === ownerId) return { id: die.id, ...blocked('來源骰必須來自另一名我方角色。') };
          const hasDestination = team.pendingDice.some((target) => target.ownerId === ownerId && target.value !== die.value);
          return {
            id: die.id,
            ...(hasDestination
              ? allowed(skillExternalWarning(engine, ownerId, die.ownerId))
              : blocked('目前沒有數值不同的自己的骰可作為目標。')),
          };
        }),
      };
    }
    const source = team.pendingDice.find((die) => die.id === partialTarget.sourceDieId);
    return {
      stage: 'targetDie',
      candidates: team.pendingDice.map((die): TargetCandidate => {
        if (die.ownerId !== ownerId) return { id: die.id, ...blocked('目標骰必須是自己的骰。') };
        if (source && source.value === die.value) return { id: die.id, ...blocked('這顆骰已經是相同數值，使用後不會產生變化。') };
        return { id: die.id, ...allowed() };
      }),
    };
  }

  const dice = spec.relation === 'enemy'
    ? engine.getTeam(engine.opponentId(teamId)).pendingDice
    : engine.getTeam(teamId).pendingDice;
  return {
    stage: 'targetDie',
    candidates: dice.map((die): TargetCandidate => ({ id: die.id, ...dieMatchesPendingSpec(engine, ownerId, skill, die) })),
  };
}

export function getSkillAvailability(
  engine: EngineSession,
  ownerId: string,
  skillId: string,
): TargetLegality {
  if (!engine.canUseActiveSkill(ownerId, skillId)) {
    return blocked('技能的使用次數已耗盡，或目前缺少必要條件。');
  }
  const skill = engine.content.skills[skillId];
  if (!skill) return blocked('找不到技能資料。');
  const spec = skill.activeTarget ?? { kind: 'none' as const };
  if (spec.kind === 'none') return allowed();
  const plan = getSkillSelectionPlan(engine, ownerId, skillId);
  return plan.candidates.some((candidate) => candidate.allowed)
    ? allowed()
    : blocked('目前沒有合法目標。');
}
