from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def rep(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f'expected snippet not found in {path}: {old[:160]!r}')
    write(path, text.replace(old, new, count))


# Make online work-type validation independently testable while preserving the session wrapper.
rep(
    'src/online/onlineSession.ts',
    """function normalizeWorkTypeSelections(
  side: OnlineDraftSide,
  requested: Record<string, WorkType>,
): Record<string, WorkType> | null {
  const draft = useOnlineSession.getState().draft;
  if (!draft || draft.status !== 'complete') return null;
  const memberIds = side === 'host' ? draft.hostPicks : draft.guestPicks;
  const normalized: Record<string, WorkType> = {};
  for (const memberId of memberIds) {
    const requestedType = requested[memberId];
    if (!requestedType || !getInitialWorkTypeChoices(memberId).includes(requestedType)) return null;
    normalized[memberId] = requestedType;
  }
  return normalized;
}
""",
    """export function normalizeOnlineWorkTypeSelections(
  draft: OnlineDraftState | null,
  side: OnlineDraftSide,
  requested: Record<string, WorkType>,
): Record<string, WorkType> | null {
  if (!draft || draft.status !== 'complete') return null;
  const memberIds = side === 'host' ? draft.hostPicks : draft.guestPicks;
  const normalized: Record<string, WorkType> = {};
  for (const memberId of memberIds) {
    const requestedType = requested[memberId];
    if (!requestedType || !getInitialWorkTypeChoices(memberId).includes(requestedType)) return null;
    normalized[memberId] = requestedType;
  }
  return normalized;
}

function normalizeWorkTypeSelections(
  side: OnlineDraftSide,
  requested: Record<string, WorkType>,
): Record<string, WorkType> | null {
  return normalizeOnlineWorkTypeSelections(useOnlineSession.getState().draft, side, requested);
}
""",
)

# Close out stale documentation now that P0-P3 are implemented on PR #75.
rep(
    'GAME_RULES.md',
    '- Initial game construction supports an explicit legal work-type choice per character; choices must be within that character\'s effective affinity (including all-affinity passives). The player-facing selection UI is tracked separately from this engine contract.',
    '- Initial game construction and the player-facing setup flow both support an explicit legal work-type choice per character; choices must be within that character\'s effective affinity (including all-affinity passives). Offline selection happens after leader choice; Online protocol v3 collects Host and Guest selections independently before the authoritative GameState is created.',
)

old_status = """### 2026-09-19 P0 discussion update

In progress on branch `feature/20260919-discussion-update-p0`:

- removed live work type `色`;
- added additive/multi-type work runtime support;
- added shared forbidden-face roll constraints and no-legal-face die removal;
- changed coordination stress-bearer selection to Stress headroom and reject cards with no legal bearer;
- added engine support for explicit initial work-type choices;
- updated 指導 pressure semantics.

The player-facing initial work-type selection screen remains the next P0 UI task.

### 2026-09-19 P0 setup UI completion

The P0 initial-work-type contract is now wired into user-facing setup: offline play inserts a work-type selection screen after leader choice, and online protocol v3 collects Host/Guest selections independently before the authoritative game is created. Legacy characters with no explicit affinity keep the existing `謀` fallback until their P2 character calibration lands."""
new_status = """### 2026-09-19 discussion update — PR #75

Implemented and automated-regression-covered on `feature/20260919-discussion-update-p3`:

- **P0 shared rules/setup**: removed live work type `色`; added primary + additive work types; initial work-type selection in Offline and Online protocol v3; shared forbidden-face roll constraints; no-legal-face die removal; coordination Stress-bearer headroom legality; updated 指導 semantics.
- **P1 card pool**: Standard deck is 15 cards (10 coordination / 5 event) with the finalized 安撫、一對一討論、指導、語音會議、精修、靈感爆發、趕工、突發加班、突發事故、卡文、技術故障、思維阻滯 behavior. Standard draw timing remains 10 cards per player through round 5.
- **P2 finalized characters**: updated 高興、酪梨、Pintbox、E、流星、Enki、旁白、銀櫻、キツ; fixed 姆咪共鳴 effective-cap trigger and preserved 弱智 final-settlement dice outside pending-die review flow.
- **P3 cross-mechanic regressions**: covers 指導 / 情緒 / 副組長力, temporary stat-zero + permanent upgrades, stacked roll restrictions, add-type vs replace-type, owner placement after type replacement, online perspective state, multi-type placement legality, and 3/5-player active-skill target availability.
- **Online work-type handshake**: pure validation tests ensure Host/Guest mappings are validated against only their own completed draft rosters; App still creates the authoritative game only after both mappings exist.

Not included because the discussion is not finalized: 塔卡斯、二蕉、FLA、逐牌狂途、心結爆發、3-player cross-affinity experiment, selectable initial work length, extra anti-deadlock opening cards, solo score/tier rules, and leader Stress bonus +3.

Automated validation is required before merge (`npm run typecheck`, full `npm run test`, `npm run build`). A real two-browser/WebRTC transport smoke test remains a manual release/review check because it depends on two live browser peers and signaling infrastructure."""
rep('PROJECT_STATUS.md', old_status, new_status)

# Add closeout regressions for multi-type placement, 3/5 target contracts and online work-type validation.
write('src/tests/discussion-pr75-closeout.test.ts', """import { describe, expect, it } from 'vitest';
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
""")

print('PR #75 closeout patch applied successfully.')
