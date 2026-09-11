import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';

export const emotionCharacter = characterDefinitionSchema.parse({
  id: 'emotion',
  name: '情緒',
  stats: { design: 1, text: 1, aa: 2 },
  maxStress: 5,
  affinities: ['情'],
  skillIds: ['emotionCraftAwareness'],
  portrait: 'assets/characters/portrait/emotion.webp',
  compactPortrait: 'assets/characters/compact/emotion.webp',
  portraitPosition: { x: 50, y: 12 },
  sourceNotes: [
    '2026-09-03 07:12:37：PintBox 明確評價情緒屬於「有意識」能想到簡單改善 AA 效果的人，並表示做 AA 最重要的是意識、其次才是技術。',
    '本人發言同時具有強烈的語氣與氣氛敏感度，例如對作品效果直接判斷「但崩」，以及提醒不要在悲傷情境放笑面 emoji。',
    '2026-09-10 角色校正：AA 定為 2，作品適性定案為僅（情）。',
    '「改善效果的意識」runtime 為 source-driven prototype：每回合一次，把自己尚未分配的一顆 AA 骰 +1，代表有意識地做小幅但有效的呈現修正。',
    'dataset(1).zip 中「〖ヰ/情緒〗何ヰ味穹蘆【消滅旁白】」共 1600 則訊息。',
  ],
});

export const emotionSkills = skillDefinitionSchema.array().parse([
  {
    id: 'emotionCraftAwareness',
    name: '改善效果的意識',
    description: '每回合一次，把自己尚未分配的一顆 AA 骰 +1（最高 6）。',
    activation: 'active',
    status: 'implemented',
    activeUsage: { scope: 'round', limit: 1 },
    activeTarget: { kind: 'none' },
    activeEffects: [{ kind: 'dice.modifyPending', target: 'owner', skill: 'aa', add: 1, limit: 1 }],
  },
]);
