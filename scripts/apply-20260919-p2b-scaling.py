from pathlib import Path


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


write('src/content/e.ts', """import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const eCharacter = characterDefinitionSchema.parse({
  id: 'e',
  name: 'E',
  stats: { design: 3, text: 2, aa: 0 },
  maxStress: 4,
  affinities: [],
  skillIds: ['eHiredWriter', 'eSelectedJokes'],
  portrait: 'assets/characters/portrait/e.webp',
  compactPortrait: 'assets/characters/compact/e.webp',
  sourceNotes: [
    '2026-09-16 final：Design 3 / Text 2 / AA 0，Stress 4。',
    '「全適性」擁有所有現行有效作品類型適性；已移除的「色」不在其中。',
    '「39萬條精選段子」改為我方每一部類型包含「笑」的作品都讓自身 Text +1；支援 additive multi-type。',
    '舊版「自己的作品為笑時固定 Text +3」已被覆蓋。',
  ],
});

export const eSkills = skillDefinitionSchema.array().parse([
  {
    id: 'eHiredWriter',
    name: '全適性',
    description: '擁有所有現行有效作品類型的適性。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'affinity.grant', types: 'all' }],
  },
  {
    id: 'eSelectedJokes',
    name: '39萬條精選段子',
    description: '我方每有 1 部類型包含「笑」的作品，自身 Text +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.workTypeCount', skill: 'text', workType: '笑', amountPerWork: 1 }],
  },
]);
""")

write('src/content/meteor.ts', """import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const meteorCharacter = characterDefinitionSchema.parse({
  id: 'meteor',
  name: '流星',
  stats: { design: 0, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['燃'],
  skillIds: ['meteorBurnDesign', 'meteorResonance', 'viceLeaderPower'],
  portrait: 'assets/characters/portrait/meteor.webp',
  compactPortrait: 'assets/characters/compact/meteor.webp',
  sourceNotes: [
    '2026-09-16 final：Design 0 / Text 1 / AA 2，Stress 4，適性（燃）。',
    '「軌之共鳴」：我方每一部類型包含「燃」的作品讓自身 Design +1。',
    '「軌言軌語」：自身 Design -1；最終 Design 仍以 0 為下限。',
    '「副組長力」保留並使用共通 headroom 規則。',
    '舊版「自己的燃作品 +1」與每回合 reroll 已被覆蓋。',
  ],
});

export const meteorSkills = skillDefinitionSchema.array().parse([
  {
    id: 'meteorBurnDesign',
    name: '軌言軌語',
    description: '自身 Design -1；最終總 Design 最低為 0。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.modify', skill: 'design', amount: -1 }],
  },
  {
    id: 'meteorResonance',
    name: '軌之共鳴',
    description: '我方每有 1 部類型包含「燃」的作品，自身 Design +1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.workTypeCount', skill: 'design', workType: '燃', amountPerWork: 1 }],
  },
]);
""")

write('src/content/enki.ts', """import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const enkiCharacter = characterDefinitionSchema.parse({
  id: 'enki',
  name: 'Enki',
  stats: { design: 3, text: 1, aa: 2 },
  maxStress: 4,
  affinities: ['謀'],
  skillIds: ['enkiViceLeader', 'enkiActingLeader', 'enkiMysteryJojo'],
  portrait: 'assets/characters/portrait/enki.webp',
  compactPortrait: 'assets/characters/compact/enki.webp',
  sourceNotes: [
    '2026-09-16 final：「推理jojo劇場」Text 增加量 = 我方類型包含「謀」的作品數 - 1。',
    '「副組長力」保留並使用共通 headroom 規則。',
    '「代組長力」維持既有已實裝行為。',
    '舊版「自己的作品是謀時固定 Text +1」已被覆蓋。',
  ],
});

export const enkiSkills = skillDefinitionSchema.array().parse([
  {
    id: 'enkiViceLeader',
    name: '副組長力',
    description: '隊伍使用統籌卡時，依共通 headroom 規則判定是否由自身承擔通常的統籌卡 Stress。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'coordination.stressBearer', allowEqual: true }],
  },
  {
    id: 'enkiActingLeader',
    name: '代組長力',
    description: '原組長神隱時，自身壓力上限永久 +2；每局只觸發一次。',
    activation: 'triggered',
    status: 'implemented',
    triggers: [{
      event: 'activeSkill',
      usage: { scope: 'game', limit: 1 },
      condition: { kind: 'eventMeta', key: 'hiddenEvent', equals: true },
      effects: [{ kind: 'custom', handler: 'grantActingLeaderStressCapIfLeaderHidden' }],
    }],
  },
  {
    id: 'enkiMysteryJojo',
    name: '推理jojo劇場',
    description: '自身 Text 增加量 = 我方類型包含「謀」的作品數 - 1。',
    activation: 'passive',
    status: 'implemented',
    passives: [{ kind: 'stat.workTypeCount', skill: 'text', workType: '謀', amountPerWork: 1, offset: -1 }],
  },
]);
""")

write('src/tests/discussion-p2b-scaling.test.ts', """import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

function createCase(ids: string[]) {
  const enemyIds = ['narrator', 'ginsakura', 'bluewind'];
  const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
    playerMemberIds: ids,
    enemyMemberIds: enemyIds,
  });
  return { game, engine: new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION) };
}

function setTypes(
  engine: EngineSession,
  ownerId: string,
  primary: '燃' | '謀' | '笑' | '情' | '怪',
  extras: Array<'燃' | '謀' | '笑' | '情' | '怪'> = [],
) {
  const work = engine.getTeam('player').works.find((item) => item.ownerId === ownerId)!;
  work.type = primary;
  work.extraTypes = [...extras];
  return work;
}

describe('2026-09-19 P2B team work-type scaling', () => {
  it('E keeps final stats, all affinity, and gains Text once for every allied work containing 笑', () => {
    const { engine } = createCase(['e', 'mashiro', 'happy']);
    expect(CHARACTERS.e?.stats).toEqual({ design: 3, text: 2, aa: 0 });
    expect(CHARACTERS.e?.maxStress).toBe(4);
    expect(engine.getEffectiveAffinity('e')).toBe('all');
    expect(SKILLS.eSelectedJokes?.activation).toBe('passive');

    setTypes(engine, 'e', '燃', ['笑']);
    setTypes(engine, 'mashiro', '笑');
    setTypes(engine, 'happy', '怪');
    expect(engine.getEffectiveStat('e', 'text')).toBe(4);

    setTypes(engine, 'happy', '怪', ['笑']);
    expect(engine.getEffectiveStat('e', 'text')).toBe(5);
  });

  it('流星 applies +1 Design for each allied 燃 work and then its fixed -1 modifier', () => {
    const { engine } = createCase(['meteor', 'mashiro', 'lemon']);
    setTypes(engine, 'meteor', '燃');
    setTypes(engine, 'mashiro', '燃');
    setTypes(engine, 'lemon', '情');
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(1); // 0 +2 -1

    setTypes(engine, 'lemon', '情', ['燃']);
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(2); // 0 +3 -1

    setTypes(engine, 'meteor', '情');
    setTypes(engine, 'mashiro', '情');
    setTypes(engine, 'lemon', '情');
    expect(engine.getEffectiveStat('meteor', 'design')).toBe(0); // floor at zero
    expect(SKILLS.meteorResonance?.activation).toBe('passive');
    expect(SKILLS.meteorBurnDesign?.activation).toBe('passive');
  });

  it('Enki Text modifier is exactly allied 謀 work count minus one and recognizes additive types', () => {
    const { engine } = createCase(['enki', 'mashiro', 'user79']);
    setTypes(engine, 'enki', '謀');
    setTypes(engine, 'mashiro', '情');
    setTypes(engine, 'user79', '燃');
    expect(engine.getEffectiveStat('enki', 'text')).toBe(1); // base 1 + (1 - 1)

    setTypes(engine, 'mashiro', '情', ['謀']);
    expect(engine.getEffectiveStat('enki', 'text')).toBe(2);

    setTypes(engine, 'user79', '謀');
    expect(engine.getEffectiveStat('enki', 'text')).toBe(3);

    setTypes(engine, 'enki', '情');
    setTypes(engine, 'mashiro', '情');
    setTypes(engine, 'user79', '燃');
    expect(engine.getEffectiveStat('enki', 'text')).toBe(0); // base 1 + (0 - 1)
  });
});
""")

print('P2B scaling-character patch applied successfully.')
