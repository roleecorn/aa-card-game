import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { placeDieWithLegality } from '../game/placement';
import {
  getCardAvailability,
  getDiePlacementLegality,
  getSkillAvailability,
  getSkillSelectionPlan,
} from '../game/targeting';

const rng = () => 0.5;

function createTargetingGame() {
  return createInitialGame(rng, STANDARD_GAME_DEFINITION, {
    playerMemberIds: ['grimm', 'user79', 'shennau'],
    enemyMemberIds: ['pintbox', 'mashiro', 'pigeon'],
  });
}

describe('target legality', () => {
  it('only exposes dice that satisfy active-skill target filters', () => {
    const game = createTargetingGame();
    const engine = new EngineSession(game, rng);

    engine.grantDice('player', 'grimm', 'text', 1, 'test', false, 4);
    expect(getSkillAvailability(engine, 'grimm', 'grimmBurningFrame').allowed).toBe(false);

    const grimmSix = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false, 6)[0]!;
    expect(getSkillSelectionPlan(engine, 'grimm', 'grimmBurningFrame').candidates
      .find((candidate) => candidate.id === grimmSix.id)?.allowed).toBe(false);

    const grimmFive = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false, 5)[0]!;
    expect(getSkillSelectionPlan(engine, 'grimm', 'grimmBurningFrame').candidates
      .find((candidate) => candidate.id === grimmFive.id)?.allowed).toBe(true);
    expect(getSkillAvailability(engine, 'grimm', 'grimmBurningFrame').allowed).toBe(true);

    const design79 = engine.grantDice('player', 'user79', 'design', 1, 'test', false, 5)[0]!;
    expect(getSkillSelectionPlan(engine, 'user79', 'burningText79').candidates
      .find((candidate) => candidate.id === design79.id)?.allowed).toBe(false);
    const text79 = engine.grantDice('player', 'user79', 'text', 1, 'test', false, 5)[0]!;
    expect(getSkillSelectionPlan(engine, 'user79', 'burningText79').candidates
      .find((candidate) => candidate.id === text79.id)?.allowed).toBe(true);

    const shennauDesign = engine.grantDice('player', 'shennau', 'design', 1, 'test', false, 4)[0]!;
    expect(getSkillSelectionPlan(engine, 'shennau', 'shennauSettingManiac').candidates
      .find((candidate) => candidate.id === shennauDesign.id)?.allowed).toBe(false);
    const shennauText = engine.grantDice('player', 'shennau', 'text', 1, 'test', false, 4)[0]!;
    expect(getSkillSelectionPlan(engine, 'shennau', 'shennauSettingManiac').candidates
      .find((candidate) => candidate.id === shennauText.id)?.allowed).toBe(true);
  });

  it('marks non-improving placement slots as illegal before execution', () => {
    const game = createTargetingGame();
    const engine = new EngineSession(game, rng);
    const die = engine.grantDice('player', 'grimm', 'design', 1, 'test', false, 3)[0]!;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'grimm')!;
    work.slots[0]!.design = 4;

    const legality = getDiePlacementLegality(engine, 'player', die, work, 0);
    expect(legality.allowed).toBe(false);
    expect(placeDieWithLegality(engine, 'player', die.id, work.id, 0)).toBe(false);
  });

  it('lets Lemon rescue dice bypass normal cross-work affinity restrictions', () => {
    const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['lemon', 'grimm', 'user79'],
      enemyMemberIds: ['pintbox', 'mashiro', 'pigeon'],
    });
    const engine = new EngineSession(game, rng);
    expect(engine.activateSkill('player', 'lemon', 'lemonFireRescue')).toBe(true);

    const rescueDesign = game.player.pendingDice.find((die) =>
      die.ownerId === 'lemon' && die.origin === '火場救援' && die.skill === 'design')!;
    expect(rescueDesign.placement).toBe('anyAllyWork');

    const grimmWork = game.player.works.find((work) => work.ownerId === 'grimm')!;
    grimmWork.type = '情';
    expect(getDiePlacementLegality(engine, 'player', rescueDesign, grimmWork, 0).allowed).toBe(true);
    expect(placeDieWithLegality(engine, 'player', rescueDesign.id, grimmWork.id, 0)).toBe(true);
    expect(grimmWork.slots[0]!.design).toBe(rescueDesign.value);
  });

  it('disables cards before opening when no legal target exists', () => {
    const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['grimm', 'user79', 'mashiro'],
      enemyMemberIds: ['pintbox', 'pigeon', 'lemon'],
    });
    const engine = new EngineSession(game, rng);

    engine.addCard('player', 'soothe', 1);
    const soothe = game.player.hand.find((card) => card.cardId === 'soothe')!;
    expect(getCardAvailability(engine, 'player', soothe).allowed).toBe(false);
    engine.getCharacter('player', 'grimm')!.stress = 1;
    expect(getCardAvailability(engine, 'player', soothe).allowed).toBe(true);

    engine.addCard('player', 'polish', 1);
    const polish = game.player.hand.find((card) => card.cardId === 'polish')!;
    expect(getCardAvailability(engine, 'player', polish).allowed).toBe(false);
    game.player.works[0]!.slots[0]!.design = 2;
    expect(getCardAvailability(engine, 'player', polish).allowed).toBe(true);
  });

  it('blocks coordination cards at the entry point when Weakzhi is leader', () => {
    const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['weakzhi', 'grimm', 'user79'],
      enemyMemberIds: ['pintbox', 'mashiro', 'pigeon'],
    });
    const engine = new EngineSession(game, rng);
    engine.addCard('player', 'soothe', 1);
    const soothe = game.player.hand.find((card) => card.cardId === 'soothe')!;
    const availability = getCardAvailability(engine, 'player', soothe);
    expect(availability.allowed).toBe(false);
    expect(availability.reason).toContain('組長');
  });
});
