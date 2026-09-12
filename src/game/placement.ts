import type { TeamId } from './schema';
import type { EngineSession } from './engine';
import { getDiePlacementLegality } from './targeting';

export function placeDieWithLegality(
  engine: EngineSession,
  teamId: TeamId,
  dieId: string,
  workId: string,
  slotIndex: number,
): boolean {
  const team = engine.getTeam(teamId);
  const die = team.pendingDice.find((candidate) => candidate.id === dieId);
  const work = team.works.find((candidate) => candidate.id === workId);
  if (!die || !work) return false;

  const legality = getDiePlacementLegality(engine, teamId, die, work, slotIndex);
  if (!legality.allowed) return false;

  if (die.placement !== 'anyAllyWork') {
    return engine.placeDie(teamId, dieId, workId, slotIndex);
  }

  const slot = work.slots[slotIndex];
  if (!slot) return false;
  slot[die.skill] = die.value;
  team.pendingDice = team.pendingDice.filter((candidate) => candidate.id !== dieId);
  engine.log(`${engine.getDefinition(die.ownerId).name} 將 ${die.skill.toUpperCase()} ${die.value} 放入「${work.title}」第 ${slotIndex + 1} 格。`);
  engine.skills.emit({
    type: 'afterDiePlaced',
    teamId,
    actorId: die.ownerId,
    dieId: die.id,
    skill: die.skill,
    workId: work.id,
    amount: die.value,
  });
  return true;
}
