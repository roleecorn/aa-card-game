import { describe, expect, it } from 'vitest';
import { BASE_DECK, CARDS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { GAMEPLAY_STATUS, hasGameplayStatus } from '../game/statuses';
import type { ActionChoice } from '../game/types';

const ROSTER = {
  playerMemberIds: ['pintbox', 'mashiro', 'user79'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function createCase(rng: () => number = () => 0.999) {
  const game = createInitialGame(rng, STANDARD_GAME_DEFINITION, ROSTER);
  game.player.hand = [];
  game.enemy.hand = [];
  return { game, engine: new EngineSession(game, rng, STANDARD_GAME_DEFINITION) };
}

function addCard(engine: EngineSession, team: 'player' | 'enemy', cardId: string) {
  engine.addCard(team, cardId, 1);
  const card = engine.getTeam(team).hand.find((item) => item.cardId === cardId);
  if (!card) throw new Error(`missing test card ${cardId}`);
  return card;
}

function slackAll(engine: EngineSession, team: 'player' | 'enemy'): Record<string, ActionChoice> {
  return Object.fromEntries(engine.getTeam(team).members.map((member) => [member.defId, 'slack'])) as Record<string, ActionChoice>;
}

describe('2026-09-19 P1 Standard card pool', () => {
  it('uses exactly 15 cards with a 10 coordination / 5 event split and excludes reconsider', () => {
    expect(BASE_DECK).toHaveLength(15);
    expect(BASE_DECK).not.toContain('reconsider');
    expect(BASE_DECK.filter((id) => CARDS[id]?.kind === 'coordination')).toHaveLength(10);
    expect(BASE_DECK.filter((id) => CARDS[id]?.kind === 'event')).toHaveLength(5);
    expect(BASE_DECK.filter((id) => id === 'soothe')).toHaveLength(2);
    expect(BASE_DECK.filter((id) => id === 'oneOnOne')).toHaveLength(2);
    expect(BASE_DECK.filter((id) => id === 'guide')).toHaveLength(2);
    for (const id of ['voice', 'polish', 'inspiration', 'rush', 'overtime', 'accident', 'writerBlock', 'techFailure', 'thoughtBlock']) {
      expect(BASE_DECK.filter((cardId) => cardId === id)).toHaveLength(1);
    }
  });

  it('keeps the existing draw timing at ten cards per player through round five', () => {
    const { game, engine } = createCase(() => 0.42);
    // Restore the opening hand removed by createCase for this timing check.
    engine.drawCards('player', STANDARD_GAME_DEFINITION.rules.initialHandSize);
    expect(game.player.hand).toHaveLength(2);
    while (game.round < game.maxRounds) {
      engine.performPlayerActions(slackAll(engine, 'player'));
      engine.finishPlayerAssignment();
    }
    expect(game.round).toBe(5);
    expect(game.player.hand).toHaveLength(10);
  });

  it('安撫 reduces Stress by three and may cross below zero', () => {
    const { game, engine } = createCase();
    const target = engine.getCharacter('player', 'mashiro')!;
    target.stress = 0;
    const card = addCard(engine, 'player', 'soothe');
    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro' })).toBe(true);
    expect(target.stress).toBe(-3);
    expect(game.player.discard).toContain('soothe');
  });

  it('一對一討論 rolls three pending dice for the selected stat without changing the permanent stat', () => {
    const { game, engine } = createCase(() => 0.999);
    const member = engine.getCharacter('player', 'mashiro')!;
    const before = member.permanentStats.text;
    const card = addCard(engine, 'player', 'oneOnOne');
    expect(engine.playCard('player', card.instanceId, { memberId: 'mashiro', skill: 'text' })).toBe(true);
    expect(game.player.pendingDice.filter((die) => die.ownerId === 'mashiro' && die.skill === 'text')).toHaveLength(3);
    expect(member.permanentStats.text).toBe(before);
  });

  it('精修 can reroll the three lowest pending dice', () => {
    const { game, engine } = createCase(() => 0.999);
    const dice = engine.grantDice('player', 'mashiro', 'design', 4, 'setup', false);
    dice.forEach((die, index) => { die.value = engine.asDieValue(index + 1); });
    const card = addCard(engine, 'player', 'polish');
    expect(engine.playCard('player', card.instanceId, { polishMode: 'pending' })).toBe(true);
    const values = game.player.pendingDice.filter((die) => die.ownerId === 'mashiro').map((die) => die.value).sort((a, b) => a - b);
    expect(values).toEqual([4, 6, 6, 6]);
  });

  it('精修 can reroll the three lowest dice already placed in one work', () => {
    const { game, engine } = createCase(() => 0.999);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    work.slots[0]!.design = 1;
    work.slots[0]!.text = 2;
    work.slots[0]!.aa = 3;
    work.slots[1]!.design = 4;
    const card = addCard(engine, 'player', 'polish');
    expect(engine.playCard('player', card.instanceId, { polishMode: 'work', workId: work.id })).toBe(true);
    expect(work.slots[0]).toMatchObject({ design: 6, text: 6, aa: 6 });
    expect(work.slots[1]!.design).toBe(4);
  });

  it('靈感爆發 forbids 1 and 2 for allied rolls for the rest of this round', () => {
    const { engine } = createCase(() => 0);
    const card = addCard(engine, 'player', 'inspiration');
    expect(engine.playCard('player', card.instanceId, {})).toBe(true);
    expect(engine.rollDieFor('mashiro')).toBe(3);
  });

  it('趕工 fills at most current-round slots for each of Design, Text and AA', () => {
    const { game, engine } = createCase();
    game.round = 3;
    const work = game.player.works.find((candidate) => candidate.ownerId === 'mashiro')!;
    const card = addCard(engine, 'player', 'rush');
    expect(engine.playCard('player', card.instanceId, { workId: work.id })).toBe(true);
    for (const skill of ['design', 'text', 'aa'] as const) {
      expect(work.slots.filter((slot) => slot[skill] === 1)).toHaveLength(3);
      expect(work.slots.filter((slot) => slot[skill] === undefined)).toHaveLength(2);
    }
  });

  it('突發加班 adds exactly two Stress', () => {
    const { engine } = createCase();
    const target = engine.getCharacter('enemy', 'ginsakura')!;
    const card = addCard(engine, 'player', 'overtime');
    expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
    expect(target.stress).toBe(2);
  });

  it('突發事故 applies shared hidden/action-block semantics for one round', () => {
    const { engine } = createCase();
    const target = engine.getCharacter('enemy', 'ginsakura')!;
    const card = addCard(engine, 'player', 'accident');
    expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
    expect(hasGameplayStatus(target, GAMEPLAY_STATUS.hidden)).toBe(true);
    expect(hasGameplayStatus(target, GAMEPLAY_STATUS.actionBlocked)).toBe(true);
  });

  it('卡文 and 技術故障 force the selected stat to zero without overwriting permanent stats', () => {
    for (const [cardId, skill] of [['writerBlock', 'text'], ['techFailure', 'aa']] as const) {
      const { engine } = createCase();
      const target = engine.getCharacter('enemy', 'ginsakura')!;
      const before = target.permanentStats[skill];
      const card = addCard(engine, 'player', cardId);
      expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
      expect(engine.getEffectiveStat('ginsakura', skill)).toBe(0);
      expect(target.permanentStats[skill]).toBe(before);
    }
  });

  it('思維阻滯 composes with the common roll constraint and forbids 5/6', () => {
    const { engine } = createCase(() => 0.999);
    const card = addCard(engine, 'player', 'thoughtBlock');
    expect(engine.playCard('player', card.instanceId, { memberId: 'ginsakura' })).toBe(true);
    expect(engine.rollDieFor('ginsakura')).toBe(4);
  });
});
