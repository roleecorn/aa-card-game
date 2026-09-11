export const CHARACTER_TAG_NAMES: Record<string, string> = {
  leader: '組長',
  review: '審稿',
  'duo-card': '雙人卡',
  'triangle-creature': '三角生物',
  'commercial-author': '商業作者',
  boss: 'Boss',
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
};

export function getCharacterTagName(tag: string): string {
  return CHARACTER_TAG_NAMES[tag] ?? tag;
}
