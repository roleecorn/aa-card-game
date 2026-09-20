from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrences, found {count}: {old!r}')
    target.write_text(text.replace(old, new), encoding='utf-8')


Path('src/content/grimm.ts').write_text("""import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const grimmCharacter = characterDefinitionSchema.parse({
  id: 'grimm',
  name: '格林',
  stats: { design: 1, text: 2, aa: 3 },
  maxStress: 4,
  affinities: ['情', '燃', '笑'],
  skillIds: ['grimmBurningFrame', 'grimmLoveForTonelico'],
  tags: ['leader', 'visual-storyteller'],
  portrait: 'assets/characters/portrait/grimm.webp',
  compactPortrait: 'assets/characters/compact/grimm.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-01 23:40:56：PintBox 將格林描述為「長板很突出但有召喚代價」的類型。',
    '2026-09-05 11:09:30–11:12:42：PintBox 將格林與 79 並列為燃燒自己產出好作品的類型，並明確設計格林版為「自身 +1 壓力，給一顆 AA 骰 +2 數值」。',
    '2026-09-10 角色校正：AA 定為 3、壓力上限定為 4，作品適性定案為（情）（燃）（笑）。',
    '2026-09-11 04:50 PintBox 補充「對托內利可的愛」：作品為（情）時，每回合一次，可將作品中任一已放置骰改為 3，之後自身壓力 -1；此技能與既有「燃燒畫面」並存。',
    '2026-09-20 regression 修正：恢復「燃燒畫面」原 ID / 原效果，並將「對托內利可的愛」拆為獨立 skill id，避免不同技能共用 identity。',
    '外觀未由 source 明確定義；runtime art 的人物外觀屬 Prototype art direction，僅以分鏡、童話與高投入畫面創作作為視覺依據。',
  ],
});

export const grimmSkills = skillDefinitionSchema.array().parse([
  {
    id: 'grimmBurningFrame',
    name: '燃燒畫面',
    description: '選擇自己一顆尚未分配的 AA 骰：自身壓力 +1，該骰 +2（最高 6）。可重複使用；壓力爆表仍依共通規則處理。',
    activation: 'active',
    status: 'implemented',
    activeTarget: { kind: 'pendingDie', relation: 'self', skill: 'aa', maxValue: 5 },
    activeEffects: [
      { kind: 'stress.change', target: 'owner', amount: 1, source: '燃燒畫面' },
      { kind: 'dice.modifySelected', add: 2 },
    ],
    tags: ['stress-tradeoff', 'aa'],
  },
  {
    id: 'grimmLoveForTonelico',
    name: '對托內利可的愛',
    description: '自己的作品為（情）時，每回合一次：選擇作品中任一已放置的 Design／Text／AA 骰，將其改為 3，然後自身壓力 -1。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeCondition: {
      kind: 'all',
      conditions: [
        { kind: 'workType', target: 'selectedWork', types: ['情'] },
        { kind: 'workHasProgress', target: 'selectedWork' },
      ],
    },
    activeHint: '先選擇自己的（情）作品，再選擇作品中一顆已放置的骰。',
    activeTarget: { kind: 'work', relation: 'owner' },
    activeEffects: [
      { kind: 'custom', handler: 'grimmLoveForTonelico' },
    ],
    tags: ['work-progress', 'stress-relief', '情'],
  },
]);
""", encoding='utf-8')

Path('src/tests/grimm-character.test.ts').write_text("""import { describe, expect, it } from 'vitest';
import { CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, EngineSession } from '../game/engine';

const ROSTER = {
  playerMemberIds: ['grimm', 'pintbox', 'mashiro'],
  enemyMemberIds: ['narrator', 'ginsakura', 'bluewind'],
};

describe('格林 complete character package', () => {
  it('keeps both independent Grimm skills and their stable identities', () => {
    expect(CHARACTERS.grimm?.stats).toEqual({ design: 1, text: 2, aa: 3 });
    expect(CHARACTERS.grimm?.maxStress).toBe(4);
    expect(CHARACTERS.grimm?.affinities).toEqual(['情', '燃', '笑']);
    expect(CHARACTERS.grimm?.skillIds).toEqual(['grimmBurningFrame', 'grimmLoveForTonelico']);
    expect(CHARACTERS.grimm?.tags).toEqual(expect.arrayContaining(['leader', 'visual-storyteller']));
    expect(CHARACTERS.grimm?.portrait).toBe('/assets/characters/portrait/grimm.webp');
    expect(CHARACTERS.grimm?.compactPortrait).toBe('/assets/characters/compact/grimm.webp');
    expect(SKILLS.grimmBurningFrame?.name).toBe('燃燒畫面');
    expect(SKILLS.grimmBurningFrame?.status).toBe('implemented');
    expect(SKILLS.grimmLoveForTonelico?.name).toBe('對托內利可的愛');
    expect(SKILLS.grimmLoveForTonelico?.status).toBe('implemented');
  });

  it('燃燒畫面 spends stress to add 2 to selected pending AA dice and is not once-per-round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const first = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false)[0]!;
    const second = engine.grantDice('player', 'grimm', 'aa', 1, 'test', false)[0]!;
    first.value = 4;
    second.value = 3;

    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', { targetDieId: first.id })).toBe(true);
    expect(first.value).toBe(6);
    expect(engine.getCharacter('player', 'grimm')?.stress).toBe(1);

    expect(engine.activateSkill('player', 'grimm', 'grimmBurningFrame', { targetDieId: second.id })).toBe(true);
    expect(second.value).toBe(5);
    expect(engine.getCharacter('player', 'grimm')?.stress).toBe(2);
  });

  it('對托內利可的愛 sets one placed die to 3 and reduces Stress once per round', () => {
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, ROSTER);
    const engine = new EngineSession(game, () => 0.5, STANDARD_GAME_DEFINITION);
    const work = game.player.works.find((candidate) => candidate.ownerId === 'grimm')!;
    const grimm = engine.getCharacter('player', 'grimm')!;
    work.type = '情';
    work.slots[0]!.aa = 5;
    grimm.stress = 2;

    expect(engine.activateSkill('player', 'grimm', 'grimmLoveForTonelico', {
      workId: work.id,
      targetDieId: '0:aa',
    })).toBe(true);
    expect(work.slots[0]!.aa).toBe(3);
    expect(grimm.stress).toBe(1);
    expect(engine.activateSkill('player', 'grimm', 'grimmLoveForTonelico', {
      workId: work.id,
      targetDieId: '0:aa',
    })).toBe(false);
  });
});
""", encoding='utf-8')

replace_exact(
    'src/app/BattleRoom.tsx',
    "  const useLegacySkillDialog = mode === 'tutorial' || pendingSkill?.id === 'grimmBurningFrame';",
    "  const useLegacySkillDialog = mode === 'tutorial'\n    || pendingSkill?.id === 'grimmBurningFrame'\n    || pendingSkill?.id === 'grimmLoveForTonelico';",
)
replace_exact(
    'src/components/SkillActivationDialog.tsx',
    "  const isGrimmTonelico = skillId === 'grimmBurningFrame';",
    "  const isGrimmTonelico = skillId === 'grimmLoveForTonelico';",
)

for path, expected in [
    ('src/tests/targeting.test.ts', 6),
    ('src/tests/skill-targeting-contracts.test.ts', 4),
    ('src/tests/action-feedback.test.ts', 2),
]:
    replace_exact(path, "'grimmBurningFrame'", "'grimmLoveForTonelico'", expected)

replace_exact(
    'docs/characters/pintbox-20260913-balance.md',
    "Runtime keeps the existing skill id `grimmBurningFrame` for compatibility, but the visible skill name and behavior are `對托內利可的愛`.",
    "This rule is an additional Grimm skill, not a replacement for `燃燒畫面`. Runtime keeps `grimmBurningFrame` for the original `燃燒畫面` behavior and registers `對托內利可的愛` separately as `grimmLoveForTonelico`.",
)
replace_exact(
    'GAME_RULES.md',
    "- **格林**：`對托內利可的愛` 只有自己的（情）作品存在已放置進度時可發動。",
    "- **格林**：有兩個獨立技能；`燃燒畫面` 可用自身 Stress 強化自己的 pending AA 骰，`對托內利可的愛` 則只有自己的（情）作品存在已放置進度時可發動。",
)
replace_exact(
    'GAME_MANUAL.md',
    "- 格林「對托內利可的愛」需要自己的（情）作品已有可修改進度。",
    "- 格林有「燃燒畫面」與「對托內利可的愛」兩個技能；前者用自身 Stress 強化 pending AA 骰，後者需要自己的（情）作品已有可修改進度。",
)
