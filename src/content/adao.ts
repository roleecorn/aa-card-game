import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const adaoCharacter = characterDefinitionSchema.parse({ id: 'adao', name: '阿道', stats: { design: 1, text: 2, aa: 1 }, maxStress: 4, affinities: ['謀', '燃'], skillIds: ['adaoFlashback', 'adaoLengthen', 'adaoShorten'], portrait: 'assets/characters/portrait/adao.webp', compactPortrait: 'assets/characters/compact/adao.webp', sourceNotes: ['2026-09-12 PintBox 較新版覆蓋先前版本：Text2/Design1/AA1，壓力4，適性（謀）（燃）；填第4/5 slot時+1壓力；全局至多兩次調整自己作品篇幅±1。'] });
export const adaoSkills = skillDefinitionSchema.array().parse([
  { id: 'adaoFlashback', name: '開個回憶篇', description: '把自身骰放入自己作品第 4 或第 5 個 slot 時，自身壓力 +1。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'afterDiePlaced', effects: [{ kind: 'custom', handler: 'adaoFlashbackStress' }] }] },
  { id: 'adaoLengthen', name: '總之先這樣・加長', description: '全局與縮短合計至多 2 次：自己的作品篇幅 +1。', activation: 'active', status: 'implemented', activeTarget: { kind: 'work', relation: 'owner' }, activeEffects: [{ kind: 'custom', handler: 'adaoAdjustLength', args: { amount: 1 } }] },
  { id: 'adaoShorten', name: '總之先這樣・縮短', description: '全局與加長合計至多 2 次：自己的作品篇幅 -1（最低 1）。', activation: 'active', status: 'implemented', activeTarget: { kind: 'work', relation: 'owner' }, activeEffects: [{ kind: 'custom', handler: 'adaoAdjustLength', args: { amount: -1 } }] },
]);
