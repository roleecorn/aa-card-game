import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';
import { withGameContent } from '../game/gameDefinition';
import { skillDefinitionSchema } from '../game/schema';

const ROSTER = {
  playerMemberIds: ['pintbox', 'shennau', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

function definitionWithTestSkill() {
  const skill = skillDefinitionSchema.parse({
    id: 'testExternalRelief',
    name: '測試外部回復',
    description: '指定一名己方其他角色，壓力 -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'member', relation: 'otherAlly' },
    activeEffects: [{ kind: 'stress.change', target: 'selectedMember', amount: -1, source: '測試外部回復' }],
  });

  return withGameContent(STANDARD_GAME_DEFINITION, {
    ...STANDARD_GAME_DEFINITION.content,
    skills: {
      ...STANDARD_GAME_DEFINITION.content.skills,
      [skill.id]: skill,
    },
    characters: {
      ...STANDARD_GAME_DEFINITION.content.characters,
      pintbox: {
        ...STANDARD_GAME_DEFINITION.content.characters.pintbox!,
        skillIds: [...STANDARD_GAME_DEFINITION.content.characters.pintbox!.skillIds, skill.id],
      },
    },
  });
}

describe('神惱「自己做」：無效不等於不能指定', () => {
  it('allows another character to activate a targeted skill on 神惱, consumes usage, but applies no effect', () => {
    const definition = definitionWithTestSkill();
    const game = createInitialGame(() => 0.5, definition, ROSTER);
    const engine = new EngineSession(game, () => 0.5, definition);
    const shennau = game.player.members.find((member) => member.defId === 'shennau')!;
    shennau.stress = 1;

    expect(engine.activateSkill('player', 'pintbox', 'testExternalRelief', { memberId: 'shennau' })).toBe(true);
    expect(shennau.stress).toBe(1);
    expect(engine.activateSkill('player', 'pintbox', 'testExternalRelief', { memberId: 'shennau' })).toBe(false);
  });

  it('does not retarget an automatic selector away from 神惱 just because the effect is immune', () => {
    const skill = skillDefinitionSchema.parse({
      id: 'testHighestStressRelief',
      name: '測試最高壓力回復',
      description: '最高壓力隊友壓力 -1。',
      activation: 'active',
      status: 'implemented',
      activeTarget: { kind: 'none' },
      activeEffects: [{ kind: 'stress.change', target: 'highestStressAlly', amount: -1, source: '測試最高壓力回復' }],
    });
    const definition = withGameContent(STANDARD_GAME_DEFINITION, {
      ...STANDARD_GAME_DEFINITION.content,
      skills: { ...STANDARD_GAME_DEFINITION.content.skills, [skill.id]: skill },
      characters: {
        ...STANDARD_GAME_DEFINITION.content.characters,
        pintbox: {
          ...STANDARD_GAME_DEFINITION.content.characters.pintbox!,
          skillIds: [...STANDARD_GAME_DEFINITION.content.characters.pintbox!.skillIds, skill.id],
        },
      },
    });
    const game = createInitialGame(() => 0.5, definition, ROSTER);
    const engine = new EngineSession(game, () => 0.5, definition);
    const shennau = game.player.members.find((member) => member.defId === 'shennau')!;
    const mashiro = game.player.members.find((member) => member.defId === 'mashiro')!;
    shennau.stress = 2;
    mashiro.stress = 1;

    expect(engine.activateSkill('player', 'pintbox', 'testHighestStressRelief')).toBe(true);
    expect(shennau.stress).toBe(2);
    expect(mashiro.stress).toBe(1);
  });

  it('allows a card to target 神惱, consumes the card, but the card effect is ineffective', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const shennau = game.player.members.find((member) => member.defId === 'shennau')!;
    shennau.stress = 2;
    game.player.hand = [{ instanceId: 'soothe-test', cardId: 'soothe' }];

    expect(engine.playCard('player', 'soothe-test', { memberId: 'shennau' })).toBe(true);
    expect(shennau.stress).toBe(2);
    expect(game.player.hand).toHaveLength(0);
    expect(game.player.discard).toContain('soothe');
  });

  it('allows 指導 to target 神惱 and consume the card without granting its effect', () => {
    const game = createInitialGame(() => 0.99, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.99, STANDARD_GAME_DEFINITION);
    game.player.hand = [{ instanceId: 'guide-test', cardId: 'guide' }];
    const beforeDice = game.player.pendingDice.length;
    const beforeDesign = game.player.members.find((member) => member.defId === 'shennau')!.permanentStats.design;

    expect(engine.playCard('player', 'guide-test', { memberId: 'shennau', skill: 'design' })).toBe(true);
    expect(game.player.pendingDice).toHaveLength(beforeDice);
    expect(game.player.members.find((member) => member.defId === 'shennau')!.permanentStats.design).toBe(beforeDesign);
    expect(game.player.hand).toHaveLength(0);
  });
});
