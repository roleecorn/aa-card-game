import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const prayCharacter = characterDefinitionSchema.parse({ id: 'pray', name: 'Pray', stats: { design: 1, text: 2, aa: 1 }, maxStress: 5, affinities: ['情', '燃'], skillIds: ['prayProductive', 'prayIllFated'], portrait: 'assets/characters/portrait/pray.webp', compactPortrait: 'assets/characters/compact/pray.webp', sourceNotes: ['2026-09-12 PintBox：Text2/Design1/AA1，壓力5，適性（情）（燃）；可把N點骰拆成N個1點同類骰；回合開始20%神隱。'] });
export const praySkills = skillDefinitionSchema.array().parse([
  { id: 'prayProductive', name: '高產', description: '把自身一顆 N 點 pending die 變成 N 顆 1 點同類骰。', activation: 'active', status: 'implemented', activeTarget: { kind: 'pendingDie', relation: 'self', minValue: 2 }, activeEffects: [{ kind: 'custom', handler: 'splitSelectedOwnerDie' }] },
  { id: 'prayIllFated', name: '命途多舛', description: '每回合開始時有 20% 機率神隱 1 輪。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', condition: { kind: 'chance', probability: 0.2 }, effects: [{ kind: 'custom', handler: 'hideOwner', args: { rounds: 1 } }] }] },
]);
