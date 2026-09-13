import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const eCharacter = characterDefinitionSchema.parse({ id: 'e', name: 'E', stats: { design: 3, text: 2, aa: 0 }, maxStress: 4, affinities: [], skillIds: ['eHiredWriter', 'eSelectedJokes'], portrait: 'assets/characters/portrait/e.webp', compactPortrait: 'assets/characters/compact/e.webp', sourceNotes: ['2026-09-12 PintBox：Design3/Text2/AA0，壓力4；全作品類型適性；作品為（笑）時Text額外+3。'] });
export const eSkills = skillDefinitionSchema.array().parse([
  { id: 'eHiredWriter', name: '受雇寫手', description: '擁有所有作品類型適性。', activation: 'passive', status: 'implemented', passives: [{ kind: 'affinity.grant', types: 'all' }] },
  { id: 'eSelectedJokes', name: '39萬條精選段子', description: '自己的作品為（笑）時，本回合 Text +3。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'roundStart', condition: { kind: 'workType', target: 'ownerWork', types: ['笑'] }, effects: [{ kind: 'stat.change', target: 'owner', skill: 'text', amount: 3, duration: 'round' }] }] },
]);
