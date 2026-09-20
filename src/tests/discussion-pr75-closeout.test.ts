import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import type { GameDefinition } from '../game/gameDefinition';
import { getDiePlacementLegality, getSkillAvailability, getSkillSelectionPlan } from '../game/targeting';
import { normalizeOnlineWorkTypeSelections } from '../online/onlineSession';
import type { OnlineDraftState } from '../online/onlineDraft';

const ROSTER_POOL = [
  'narrator', 'ginsakura', 'avocado', 'pintbox', 'mashiro',
  'user79', 'meteor', 'happy', 'e', 'enki', 'kitsu',
];

function definitionWithTeamSize(teamSize: 3 | 5): GameDefinition {
  return {
    ...STANDARD_GAME_DEFINITION,
    id: `pr75-closeout-${teamSize}`,
    rules: { ...STANDARD_GAME_DEFINITION.rules, teamSize },
  };
}

function createHarness(teamSize: 3 | 5, ownerId: string) {
  const definition = definitionWithTeamSize(teamSize);
  const ordered = [ownerId, ...ROSTER_POOL.filter((id) => id !== ownerId)];
  const playerMemberIds = ordered.slice(0, teamSize);
  const enemyMemberIds = ordered.slice(teamSize, teamSize * 2);
  const game = createInitialGame(() => 0.5, definition, { playerMemberIds, enemyMemberIds });
  return { game, engine: new EngineSession(game, () => 0.5, definition) };
}

describe('PR #75 closeout regressions', () => {
  it('uses every current work type for UI placement legality, matching EngineSession.canPlaceDie', () => {
    const { game, engine } = createHarness(3, 'kitsu');
    const targetWork = game.player.works.find((work) => work.ownerId === 'narrator')!;
    targetWork.type = '燃';
    targetWork.extraTypes = ['怪'];

    const die = engine.grantDice('player', 'kitsu', 'design', 1, 'setup', false, 4)[0]!;
    die.value = 4;

    expect(engine.getEffectiveAffinity('kitsu')).toEqual(expect.arrayContaining(['怪']));
    expect(engine.canPlaceDie('player', die, targetWork, 0)).toBe(true);
    expect(getDiePlacementLegality(engine, 'player', die, targetWork, 0)).toEqual({ allowed: true });
  });

  it.each([3, 5] as const)('keeps finalized active skills free of target dead-ends in %i-player mode', (teamSize) => {
    {
      const { engine } = createHarness(teamSize, 'narrator');
      expect(getSkillAvailability(engine, 'narrator', 'narratorLongForm').allowed).toBe(true);
      expect(getSkillSelectionPlan(engine, 'narrator', 'narratorLongForm').stage).toBe('none');

      const availability = getSkillAvailability(engine, 'narrator', 'narratorOsaka');
      const plan = getSkillSelectionPlan(engine, 'narrator', 'narratorOsaka');
      expect(availability.allowed).toBe(true);
      expect(plan.stage).toBe('work');
      expect(plan.candidates.some((candidate) => candidate.allowed)).toBe(true);
    }

    {
      const { game, engine } = createHarness(teamSize, 'ginsakura');
      const otherId = game.player.members.find((member) => member.defId !== 'ginsakura')!.defId;
      const source = engine.grantDice('player', 'ginsakura', 'design', 1, 'setup', false, 4)[0]!;
      const target = engine.grantDice('player', otherId, 'text', 1, 'setup', false, 2)[0]!;
      source.value = 4;
      target.value = 2;

      expect(getSkillAvailability(engine, 'ginsakura', 'ginsakuraSupport').allowed).toBe(true);
      const sourcePlan = getSkillSelectionPlan(engine, 'ginsakura', 'ginsakuraSupport');
      expect(sourcePlan.stage).toBe('sourceDie');
      expect(sourcePlan.candidates.find((candidate) => candidate.id === source.id)?.allowed).toBe(true);
      const targetPlan = getSkillSelectionPlan(engine, 'ginsakura', 'ginsakuraSupport', { sourceDieId: source.id });
      expect(targetPlan.stage).toBe('targetDie');
      expect(targetPlan.candidates.find((candidate) => candidate.id === target.id)?.allowed).toBe(true);
    }

    {
      const { game, engine } = createHarness(teamSize, 'avocado');
      const otherId = game.player.members.find((member) => member.defId !== 'avocado')!.defId;
      engine.grantDice('player', otherId, 'design', 1, 'setup', false, 3);
      expect(getSkillAvailability(engine, 'avocado', 'avocadoGameTech').allowed).toBe(true);
      expect(getSkillSelectionPlan(engine, 'avocado', 'avocadoGameTech').stage).toBe('none');
    }

    {
      const { game, engine } = createHarness(teamSize, 'pintbox');
      const otherId = game.player.members.find((member) => member.defId !== 'pintbox')!.defId;
      const low = engine.grantDice('player', otherId, 'design', 1, 'setup', false, 1)[0]!;
      low.value = 1;
      expect(getSkillAvailability(engine, 'pintbox', 'pintboxBasicRequirements').allowed).toBe(true);
      expect(getSkillSelectionPlan(engine, 'pintbox', 'pintboxBasicRequirements').stage).toBe('none');
    }
  });

  it('validates Host and Guest work-type handshakes against only their own completed draft rosters', () => {
    const draft: OnlineDraftState = {
      teamSize: 3,
      poolIds: ['avocado', 'meteor', 'e', 'happy', 'pintbox', 'mashiro'],
      hostPicks: ['avocado', 'meteor', 'e'],
      guestPicks: ['happy', 'pintbox', 'mashiro'],
      batchIndex: 4,
      pickedInBatch: 0,
      status: 'complete',
    };

    expect(normalizeOnlineWorkTypeSelections(draft, 'host', {
      avocado: '謀', meteor: '燃', e: '笑', happy: '怪',
    })).toEqual({ avocado: '謀', meteor: '燃', e: '笑' });

    expect(normalizeOnlineWorkTypeSelections(draft, 'guest', {
      happy: '怪', pintbox: '謀', mashiro: '情', avocado: '謀',
    })).toEqual({ happy: '怪', pintbox: '謀', mashiro: '情' });

    expect(normalizeOnlineWorkTypeSelections(draft, 'host', { avocado: '謀', meteor: '燃' })).toBeNull();
    expect(normalizeOnlineWorkTypeSelections(draft, 'host', {
      avocado: '謀', meteor: '謀', e: '笑',
    })).toBeNull();
    expect(normalizeOnlineWorkTypeSelections({ ...draft, status: 'drafting' }, 'host', {
      avocado: '謀', meteor: '燃', e: '笑',
    })).toBeNull();
  });
});
