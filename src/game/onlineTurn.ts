import type { EngineSession } from './engine';
import type { TeamId } from './schema';
import type { ActionChoice, Phase } from './types';

type OnlineEngineInternals = {
  performTeamActions: (teamId: TeamId, actions: Record<string, ActionChoice>) => void;
  advanceRound: () => void;
};

function internals(engine: EngineSession): OnlineEngineInternals {
  return engine as unknown as OnlineEngineInternals;
}

function planPhase(teamId: TeamId): Phase {
  return teamId === 'player' ? 'player-plan' : 'enemy-plan';
}

function assignPhase(teamId: TeamId): Phase {
  return teamId === 'player' ? 'player-assign' : 'enemy-assign';
}

export function performOnlineTeamActions(
  engine: EngineSession,
  teamId: TeamId,
  actions: Record<string, ActionChoice>,
): boolean {
  if (engine.state.phase !== planPhase(teamId)) return false;
  if (engine.getTeam(teamId).hand.length > engine.gameDefinition.rules.handLimit) return false;

  internals(engine).performTeamActions(teamId, actions);
  if (engine.state.phase !== 'finished') engine.state.phase = assignPhase(teamId);
  return true;
}

export function finishOnlineAssignment(engine: EngineSession, teamId: TeamId): boolean {
  if (engine.state.phase !== assignPhase(teamId)) return false;

  const team = engine.getTeam(teamId);
  if (team.hand.length > engine.gameDefinition.rules.handLimit) return false;
  if (team.pendingDice.length) {
    engine.log(`${team.name} 放棄了 ${team.pendingDice.length} 顆未分配骰。`);
    team.pendingDice = [];
  }

  if (teamId === 'player') {
    engine.state.phase = 'enemy-plan';
    return true;
  }

  internals(engine).advanceRound();
  return true;
}
