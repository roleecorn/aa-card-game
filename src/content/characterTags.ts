export const CHARACTER_TAG_NAMES: Record<string, string> = {
  leader: '組長',
  review: '審稿',
  'duo-card': '雙人卡',
  'triangle-creature': '三角生物',
  'commercial-author': '商業作者',
  boss: 'Boss',
  'not-standard-playable': '非標準可出戰',
  'no-stress': '無壓力',
  'vice-leader': '副組長',
  technical: '技術',
  qa: '品質驗證',
  regression: '回歸測試',
  'visual-storyteller': '視覺敘事',
  editorial: '編輯',
  'reader-perspective': '讀者視角',
  'solo-creator': '獨立創作者',
  'stress-driven': '壓力驅動',
  'gag-writer': '段子作者',
  'systems-thinker': '系統思考',
  'cannot-act': '不能行動',
  'coordination-untargetable': '不受統籌指定',
  'coordination-disabled-as-leader': '組長時禁用統籌卡',
};

export function getCharacterTagName(tag: string): string {
  return CHARACTER_TAG_NAMES[tag] ?? tag;
}
