import { characterDefinitionSchema, skillDefinitionSchema } from '../game/schema';
export const yamadaCharacter = characterDefinitionSchema.parse({
  id: 'yamada', name: '山田', stats: { design: 1, text: 1, aa: 2 }, maxStress: 4, affinities: ['怪'],
  skillIds: ['yamadaRadioJump', 'yamadaInternalConflict', 'yamadaDisappear'], portrait: 'assets/characters/portrait/yamada.webp', compactPortrait: 'assets/characters/compact/yamada.webp',
  sourceNotes: ['2026-09-11：卡奧斯提出適性（怪），PintBox 以👌認可。', '2026-09-12 PintBox：第一回合額外3 Text +3 Design；骰出1/2時壓力+1；壓力到達上限後神隱到遊戲結束。'],
});
export const yamadaSkills = skillDefinitionSchema.array().parse([
  { id: 'yamadaRadioJump', name: '電波跳躍', description: '第一回合開始時，額外獲得 3 顆 Text 與 3 顆 Design 骰。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'gameStart', effects: [{ kind: 'dice.grant', target: 'owner', skill: 'text', count: 3, origin: '電波跳躍', extra: true }, { kind: 'dice.grant', target: 'owner', skill: 'design', count: 3, origin: '電波跳躍', extra: true }] }] },
  { id: 'yamadaInternalConflict', name: '內耗', description: '自身擲出的每顆 1 或 2 都令自身壓力 +1；若因此或本次工作將到達壓力上限，立即神隱。', activation: 'triggered', status: 'implemented', triggers: [
    { event: 'afterRollBatch', priority: 150, condition: { kind: 'relation', field: 'actorId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'yamadaInternalConflict', args: { projectWorkStress: true } }] },
    { event: 'afterDiceGranted', priority: 150, condition: { kind: 'relation', field: 'targetId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'yamadaInternalConflict', args: { projectWorkStress: false } }] },
  ] },
  { id: 'yamadaDisappear', name: '神隱', description: '壓力到達上限時神隱到遊戲結束。', activation: 'triggered', status: 'implemented', triggers: [{ event: 'afterExternalStress', priority: 200, condition: { kind: 'relation', field: 'targetId', relation: 'self' }, effects: [{ kind: 'custom', handler: 'hideOwnerIfAtStressCap' }] }] },
]);
