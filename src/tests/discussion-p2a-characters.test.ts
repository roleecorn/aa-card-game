import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

function createGame(playerMemberIds: string[], enemyMemberIds = ['narrator', 'ginsakura', 'bluewind'], rng: () => number = () => 0.999) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, { playerMemberIds, enemyMemberIds });
  const engine = new EngineSession(game, rng, STANDARD_GAME_DEFINITION);
  return { game, engine };
}

describe('2026-09-19 P2A character updates', () => {
  it('高興 uses AA 1 and 高興素 adds 怪 without replacing the original work type', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['happy', 'pintbox', 'mashiro'],
      enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
      playerWorkTypes: { happy: '怪', pintbox: '謀', mashiro: '燃' },
    });
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    expect(CHARACTERS.happy?.stats).toEqual({ design: 3, text: 0, aa: 1 });
    const pintboxWork = game.player.works.find((work) => work.ownerId === 'pintbox')!;
    const mashiroWork = game.player.works.find((work) => work.ownerId === 'mashiro')!;
    expect(pintboxWork.type).toBe('謀');
    expect(engine.getWorkTypes(pintboxWork)).toEqual(expect.arrayContaining(['謀', '怪']));
    expect(mashiroWork.type).toBe('燃');
    expect(engine.getWorkTypes(mashiroWork)).toEqual(expect.arrayContaining(['燃', '怪']));
    expect(SKILLS.happyContagion?.name).toBe('高興素');
  });

  it('酪梨 uses the final stats and converts all allied Design pending dice into same-value AA dice while below cap', () => {
    const { game, engine } = createGame(['avocado', 'mashiro', 'user79']);
    expect(CHARACTERS.avocado?.stats).toEqual({ design: 2, text: 1, aa: 0 });
    expect(CHARACTERS.avocado?.maxStress).toBe(3);
    expect(CHARACTERS.avocado?.affinities).toEqual(['謀']);

    const a = engine.grantDice('player', 'mashiro', 'design', 1, 'setup', false, 2)[0]!;
    const b = engine.grantDice('player', 'user79', 'design', 1, 'setup', false, 5)[0]!;
    a.value = 2;
    b.value = 5;
    expect(engine.canUseActiveSkill('avocado', 'avocadoGameTech')).toBe(true);
    expect(engine.activateSkill('player', 'avocado', 'avocadoGameTech')).toBe(true);
    expect(game.player.pendingDice.find((die) => die.id === a.id)).toMatchObject({ skill: 'aa', value: 2 });
    expect(game.player.pendingDice.find((die) => die.id === b.id)).toMatchObject({ skill: 'aa', value: 5 });

    engine.grantDice('player', 'mashiro', 'design', 1, 'setup-2', false, 4);
    const avocadoCap = engine.getEffectiveMaxStress('player', 'avocado')!;
    engine.getCharacter('player', 'avocado')!.stress = avocadoCap;
    expect(engine.canUseActiveSkill('avocado', 'avocadoGameTech')).toBe(false);
  });

  it('需要使用說明 reacts to member-target coordination cards aimed elsewhere, but not self/work/team-wide cards', () => {
    const { game, engine } = createGame(['mashiro', 'avocado', 'user79']);
    const avocado = engine.getCharacter('player', 'avocado')!;
    game.player.hand = [];

    engine.addCard('player', 'soothe', 1);
    let card = game.player.hand.find((item) => item.cardId === 'soothe')!;
    expect(engine.playCard('player', card.instanceId, { memberId: 'user79' })).toBe(true);
    expect(avocado.stress).toBe(1);

    engine.addCard('player', 'soothe', 1);
    card = game.player.hand.find((item) => item.cardId === 'soothe')!;
    expect(engine.playCard('player', card.instanceId, { memberId: 'avocado' })).toBe(true);
    expect(avocado.stress).toBe(-2); // soothe itself applies -3; manual skill does not add +1.

    engine.addCard('player', 'inspiration', 1);
    card = game.player.hand.find((item) => item.cardId === 'inspiration')!;
    expect(engine.playCard('player', card.instanceId, {})).toBe(true);
    expect(avocado.stress).toBe(-2);
  });

  it('Pintbox team review is once per round, charges once per affected member per pass, and rerolls all low pending dice', () => {
    const { game, engine } = createGame(['pintbox', 'mashiro', 'user79'], undefined, () => 0.999);
    game.player.pendingDice = [];
    const mashiro = engine.grantDice('player', 'mashiro', 'design', 2, 'setup', false, 1);
    const user = engine.grantDice('player', 'user79', 'text', 1, 'setup', false, 2);
    mashiro.forEach((die) => { die.value = 1; });
    user[0]!.value = 2;

    expect(engine.canUseActiveSkill('pintbox', 'pintboxBasicRequirements')).toBe(true);
    expect(engine.activateSkill('player', 'pintbox', 'pintboxBasicRequirements')).toBe(true);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'mashiro').every((die) => die.value >= 3)).toBe(true);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'user79').every((die) => die.value >= 3)).toBe(true);
    expect(engine.getCharacter('player', 'mashiro')?.stress).toBe(1);
    expect(engine.getCharacter('player', 'user79')?.stress).toBe(1);
    expect(engine.canUseActiveSkill('pintbox', 'pintboxBasicRequirements')).toBe(false);
  });

  it('Pintbox AI does not consume its shield on normal coordination cost, then reduces the first other Stress gain', () => {
    const { game, engine } = createGame(['pintbox', 'mashiro', 'user79']);
    game.player.hand = [];
    const pintbox = engine.getCharacter('player', 'pintbox')!;

    engine.addCard('player', 'oneOnOne', 1);
    const coordination = game.player.hand.find((item) => item.cardId === 'oneOnOne')!;
    expect(engine.playCard('player', coordination.instanceId, { memberId: 'mashiro', skill: 'design' })).toBe(true);
    expect(pintbox.stress).toBe(1); // normal coordination +1 is not reduced by AI.

    engine.adjustStress('player', 'pintbox', 2, '測試外部壓力', true, 'narrator');
    expect(pintbox.stress).toBe(2); // +2 becomes +1 on the first eligible gain.
    engine.adjustStress('player', 'pintbox', 2, '第二次外部壓力', true, 'narrator');
    expect(pintbox.stress).toBe(4);
  });

  it('Pintbox review clears pending dice before reroll if the review Stress pushes a member over cap', () => {
    const { game, engine } = createGame(['pintbox', 'mashiro', 'user79']);
    game.player.pendingDice = [];
    const mashiro = engine.getCharacter('player', 'mashiro')!;
    const max = engine.getEffectiveMaxStress('player', 'mashiro')!;
    mashiro.stress = max;
    const die = engine.grantDice('player', 'mashiro', 'design', 1, 'setup', false, 1)[0]!;
    die.value = 1;
    expect(engine.activateSkill('player', 'pintbox', 'pintboxBasicRequirements')).toBe(true);
    expect(game.player.pendingDice.some((candidate) => candidate.ownerId === 'mashiro')).toBe(false);
  });
});
