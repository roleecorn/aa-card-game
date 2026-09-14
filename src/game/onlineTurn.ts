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

function drawCardsWithoutAiDiscard(engine: EngineSession, teamId: TeamId, count: number): void {
  const team = engine.getTeam(teamId);
  for (let i = 0; i < count; i += 1) {
    if (team.deck.length === 0) {
      team.deck = engine.shuffle(team.discard);
      team.discard = [];
    }
    const cardId = team.deck.shift();
    if (!cardId) return;
    team.hand.push({ instanceId: engine.uid('card'), cardId });
  }
}

function addCardsWithoutAiDiscard(engine: EngineSession, teamId: TeamId, cardId: string, count: number): void {
  const team = engine.getTeam(teamId);
  for (let i = 0; i < count; i += 1) team.hand.push({ instanceId: engine.uid('card'), cardId });
}

/**
 * Standard mode encodes the assumption that `enemy` is AI-controlled, including
 * automatic overflow discard during draw/add-card. Online mode keeps the standard
 * Engine untouched and temporarily replaces those two public card-flow methods
 * while the shared private round transition runs. This keeps roundEnd/cleanup/draw/
 * roundStart behavior identical without silently discarding a human player's hand.
 */
function advanceHumanRound(engine: EngineSession): void {
  const drawDescriptor = Object.getOwnPropertyDescriptor(engine, 'drawCards');
  const addDescriptor = Object.getOwnPropertyDescriptor(engine, 'addCard');

  Object.defineProperty(engine, 'drawCards', {
    configurable: true,
    value: (teamId: TeamId, count: number) => drawCardsWithoutAiDiscard(engine, teamId, count),
  });
  Object.defineProperty(engine, 'addCard', {
    configurable: true,
    value: (teamId: TeamId, cardId: string, count: number) => addCardsWithoutAiDiscard(engine, teamId, cardId, count),
  });

  try {
    internals(engine).advanceRound();
  } finally {
    if (drawDescriptor) Object.defineProperty(engine, 'drawCards', drawDescriptor);
    else delete (engine as unknown as Record<string, unknown>).drawCards;
    if (addDescriptor) Object.defineProperty(engine, 'addCard', addDescriptor);
    else delete (engine as unknown as Record<string, unknown>).addCard;
  }
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
  if (team.pendingDice.length) {
    engine.log(`${team.name} 放棄了 ${team.pendingDice.length} 顆未分配骰。`);
    team.pendingDice = [];
  }

  if (teamId === 'player') {
    engine.state.phase = 'enemy-plan';
    return true;
  }

  advanceHumanRound(engine);
  return true;
}
