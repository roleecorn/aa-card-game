import { describe, expect, it, vi } from 'vitest';
import { createTutorialGame, createTutorialSession } from '../tutorial/runtime';
import { createTutorialRuntimeState } from '../tutorial/scenario';
import type { EffectContext } from '../game/types';

function setup() {
  const state = createTutorialGame();
  state.feedback = [];
  const runtime = createTutorialRuntimeState();
  const engine = createTutorialSession(state, runtime);
  return { state, runtime, engine };
}
describe('action feedback observation', () => {
  it('keeps automatic no-ops quiet and names unchanged explicit targets', () => {
    const { state, engine } = setup();
    const context: EffectContext = { ownerId: 'grimm', ownerTeamId: 'player', definition: { id: 'test', name: 'Test' }, event: { type: 'roundStart' } };
    engine.feedback.capture(context, 'skill', () => true);
    expect(state.feedback).toHaveLength(0);
    engine.feedback.capture({ ...context, event: { type: 'activeSkill' }, activationTarget: { memberId: 'mashiro' } }, 'skill', () => true);
    expect(state.feedback![0].impacts).toContainEqual(expect.objectContaining({ anchor: 'member:mashiro', tone: 'neutral', after: '無可見數值變化' }));
  });
  it('preserves the card caster for delayed writer block and marks the debuff', () => {
    const { state, engine } = setup();
    const card = state.player.hand.find(c => c.cardId === 'writerBlock')!;
    expect(engine.playCard('player', card.instanceId, { memberId: 'pintbox' })).toBe(true);
    const event = state.feedback!.find(e => e.name === '卡文')!;
    expect(event.impacts).toContainEqual(expect.objectContaining({ anchor: 'member:pintbox', tone: 'negative' }));
    engine.performPlayerActions({ mashiro: 'work', grimm: 'work', triangle: 'work' });
    engine.finishPlayerAssignment();
    const delayed = state.feedback!.find(e => e.name === '卡文（延遲觸發）')!;
    expect(delayed).toMatchObject({ actorId: 'mashiro', teamId: 'player', kind: 'card' });
    expect(delayed.impacts).toContainEqual(expect.objectContaining({ anchor: 'member:pintbox', part: '壓力', tone: 'negative' }));
  });
  it('reports partial changes honestly and unwinds observation scopes after errors', () => {
    const { state, engine } = setup();
    const context: EffectContext = { ownerId: 'grimm', ownerTeamId: 'player', definition: { id: 'test', name: 'Test' }, event: { type: 'activeSkill' } };
    expect(() => engine.feedback.capture(context, 'skill', () => { state.player.members[1].stress++; throw new Error('test'); })).toThrow('test');
    expect(state.feedback!.at(-1)?.incomplete).toBe(true);
    engine.feedback.capture(context, 'skill', () => { state.player.members[1].stress++; return true; });
    expect(state.feedback!.at(-1)?.impacts).toContainEqual(expect.objectContaining({ before: 1, after: 2 }));
  });
  it('reports skill costs and gains separately at their actual targets', () => {
    const { state, engine } = setup();
    engine.performPlayerActions({ mashiro: 'work', grimm: 'work', triangle: 'work' });
    const die = state.player.pendingDice.find(d => d.ownerId === 'grimm' && d.skill === 'aa')!;
    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', { targetDieId: die.id })).toBe(true);
    const event = state.feedback!.find(e => e.name === '燃燒畫面')!;
    expect(event.actorId).toBe('grimm');
    expect(event.impacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ anchor: 'member:grimm', part: '壓力', tone: 'negative' }),
      expect.objectContaining({ anchor: `die:${die.id}`, part: 'AA 骰', tone: 'positive' }),
    ]));
  });
  it('rejects invalid skills without presenting successful activation', () => {
    const { state, engine } = setup();
    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', {})).toBe(false);
    expect(state.feedback).toEqual([]);
  });
  it('attributes nested mutations to the nested source without duplicating them', () => {
    const { state, engine } = setup();
    const context: EffectContext = { ownerId: 'grimm', ownerTeamId: 'player', definition: { id: 'outer', name: 'Outer' }, event: { type: 'activeSkill' } };
    engine.feedback.capture(context, 'skill', () => {
      state.player.members[1].stress++;
      engine.feedback.capture({ ...context, ownerId: 'mashiro', definition: { id: 'inner', name: 'Inner' } }, 'skill', () => {
        state.player.members[1].stress++;
        return true;
      });
      return true;
    });
    expect(state.feedback!.map(e => e.name)).toEqual(['Outer', 'Inner']);
    expect(state.feedback![0].impacts.filter(i => i.part === '壓力')).toEqual([expect.objectContaining({ before: 0, after: 1 })]);
    expect(state.feedback![1].impacts.filter(i => i.part === '壓力')).toEqual([expect.objectContaining({ before: 1, after: 2 })]);
  });
  it('preserves deterministic gameplay, RNG cursor and logs with presentation disabled', () => {
    const observed = setup();
    const silent = setup();
    // Both runs share IDs to compare every gameplay field, not just scores.
    let idA = 0, idB = 0;
    observed.engine.uid = prefix => `${prefix}-${idA++}`;
    silent.engine.uid = prefix => `${prefix}-${idB++}`;
    silent.state.player = structuredClone(observed.state.player);
    silent.state.enemy = structuredClone(observed.state.enemy);
    silent.state.logs = structuredClone(observed.state.logs);
    vi.spyOn(silent.engine.feedback, 'capture').mockImplementation((_context, _kind, action) => action());
    for (const { engine } of [observed, silent]) {
      engine.performPlayerActions({ mashiro: 'work', grimm: 'work', triangle: 'work' });
      engine.finishPlayerAssignment();
    }
    const gameplay = ({ feedback: _feedback, feedbackSequence: _sequence, ...state }: typeof observed.state) => state;
    expect(gameplay(observed.state)).toEqual(gameplay(silent.state));
    expect(observed.runtime).toEqual(silent.runtime);
  });
  it('records actual work cells and card actor, and retains bounded history', () => {
    const { state, engine } = setup();
    const card = state.player.hand.find(c => c.cardId === 'guide')!;
    expect(engine.playCard('player', card.instanceId, { memberId: 'grimm', skill: 'design' })).toBe(true);
    expect(state.feedback!.some(e => e.kind === 'card' && e.actorId === state.player.leaderId)).toBe(true);
    const context: EffectContext = { ownerId: 'grimm', ownerTeamId: 'player', definition: { id: 'test', name: 'Test' }, event: { type: 'activeSkill' } };
    engine.feedback.capture(context, 'skill', () => { state.player.works[0].slots[0].design = 6; return true; });
    expect(state.feedback!.at(-1)!.impacts).toContainEqual(expect.objectContaining({ anchor: `work:${state.player.works[0].id}`, part: '第 1 格 DESIGN', after: 6, tone: 'positive' }));
    for (let i = 0; i < 110; i++) engine.feedback.capture(context, 'skill', () => true);
    expect(state.feedback).toHaveLength(100);
    expect(new Set(state.feedback!.map(e => e.id)).size).toBe(100);
  });
});
