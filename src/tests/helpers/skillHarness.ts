import { DEFAULT_CONTENT, STANDARD_GAME_DEFINITION } from '../../content/catalog';
import { createInitialGame, EngineSession } from '../../game/engine';
import type { CharacterDefinition } from '../../game/schema';
import type { GameDefinition } from '../../game/gameDefinition';

export const SKILL_FIXTURES = {
  playerA: 'fixture-player-a',
  playerB: 'fixture-player-b',
  triangle: 'fixture-triangle',
  enemyA: 'fixture-enemy-a',
  enemyB: 'fixture-enemy-b',
  enemyC: 'fixture-enemy-c',
} as const;

const ALL_AFFINITIES = ['燃', '謀', '笑', '情', '怪'] as const;

function neutralCharacter(id: string, tags?: string[]): CharacterDefinition {
  return {
    id,
    name: id,
    stats: { design: 1, text: 1, aa: 1 },
    maxStress: 5,
    affinities: [...ALL_AFFINITIES],
    skillIds: [],
    tags,
  };
}

const fixtureCharacters: Record<string, CharacterDefinition> = {
  [SKILL_FIXTURES.playerA]: neutralCharacter(SKILL_FIXTURES.playerA),
  [SKILL_FIXTURES.playerB]: neutralCharacter(SKILL_FIXTURES.playerB),
  [SKILL_FIXTURES.triangle]: neutralCharacter(SKILL_FIXTURES.triangle, ['triangle-creature']),
  [SKILL_FIXTURES.enemyA]: neutralCharacter(SKILL_FIXTURES.enemyA),
  [SKILL_FIXTURES.enemyB]: neutralCharacter(SKILL_FIXTURES.enemyB),
  [SKILL_FIXTURES.enemyC]: neutralCharacter(SKILL_FIXTURES.enemyC),
};

export const ISOLATED_SKILL_GAME_DEFINITION: GameDefinition = {
  ...STANDARD_GAME_DEFINITION,
  id: 'skill-test',
  content: {
    ...DEFAULT_CONTENT,
    characters: {
      ...DEFAULT_CONTENT.characters,
      ...fixtureCharacters,
    },
  },
  rules: {
    ...STANDARD_GAME_DEFINITION.rules,
    initialHandSize: 0,
    cardsPerRound: 0,
    leaderStressBonus: 0,
  },
  roster: { excludedCharacterIds: [] },
};

function fillRoster(requested: string[], defaults: string[]): string[] {
  const result = [...requested];
  for (const id of defaults) {
    if (result.length >= ISOLATED_SKILL_GAME_DEFINITION.rules.teamSize) break;
    if (!result.includes(id)) result.push(id);
  }
  if (result.length !== ISOLATED_SKILL_GAME_DEFINITION.rules.teamSize) {
    throw new Error(`skill harness requires exactly ${ISOLATED_SKILL_GAME_DEFINITION.rules.teamSize} unique members per team`);
  }
  return result;
}

export function createSkillHarness(options: {
  player?: string[];
  enemy?: string[];
  rng?: () => number;
} = {}): { game: ReturnType<typeof createInitialGame>; engine: EngineSession; definition: GameDefinition } {
  const rng = options.rng ?? (() => 0.5);
  const playerMemberIds = fillRoster(options.player ?? [], [SKILL_FIXTURES.playerA, SKILL_FIXTURES.playerB, SKILL_FIXTURES.triangle]);
  const enemyMemberIds = fillRoster(options.enemy ?? [], [SKILL_FIXTURES.enemyA, SKILL_FIXTURES.enemyB, SKILL_FIXTURES.enemyC]);
  const game = createInitialGame(rng, ISOLATED_SKILL_GAME_DEFINITION, { playerMemberIds, enemyMemberIds });
  return { game, engine: new EngineSession(game, rng, ISOLATED_SKILL_GAME_DEFINITION), definition: ISOLATED_SKILL_GAME_DEFINITION };
}

export function sequenceRng(values: number[], fallback = 0.5): () => number {
  let index = 0;
  return () => values[index++] ?? fallback;
}
