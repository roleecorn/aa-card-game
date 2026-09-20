from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path('.')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


# 1) Remove the incorrectly introduced raster card art. These binaries were not
# consistent with the repository's established per-card SVG asset convention.
for name in ['one-on-one.webp', 'inspiration.webp', 'accident.webp', 'tech-failure.webp', 'thought-block.webp']:
    path = ROOT / 'public/assets/cards' / name
    if path.exists():
        path.unlink()

# 2) Canonical card-art specification, derived from the existing SVG assets.
write('CARD_ART_STYLE.md', r'''# Card Art SVG Specification

This document defines the canonical runtime illustration style for individual cards under `public/assets/cards/`.
It is derived from the repository's existing card SVGs; it is not a new visual direction.

## 1. Reference-first rule

Before adding a new card illustration, identify at least one existing card SVG that already solves the closest visual problem.
The new asset must follow that file family's format, composition language, filters, stroke treatment, and naming conventions.

If no suitable reference exists, do not invent a new asset format or visual language first. Document the missing convention here, review it, and only then add the new asset.

The two raster files `coordination.png` and `event.png` are category/UI assets, not precedent for individual card illustrations.
Individual runtime card illustrations use SVG.

## 2. Canonical SVG structure

Existing references: `soothe.svg`, `guide.svg`, `voice.svg`, `polish.svg`, `rush.svg`, `overtime.svg`, `writer-block.svg`.

Every individual card illustration should follow these constraints:

| Item | Canonical rule |
| --- | --- |
| Format | UTF-8 SVG text |
| Location | `public/assets/cards/<kebab-case-name>.svg` |
| Canvas | `viewBox="0 0 768 480"` (8:5) |
| Outer frame | `<rect width="768" height="480" rx="28" ... />` |
| Background | simple diagonal `linearGradient` named `bg` |
| Surface texture | `paper` filter using `feTurbulence` + `feBlend`, opacity about `.22` |
| Drawn texture | `crayon` filter using `feTurbulence` + `feDisplacementMap`, scale about `5` |
| Main group | `filter="url(#crayon)"`, round line caps and joins |
| Shape language | small number of simple circles / rects / paths / ellipses |
| Stroke language | broad, rounded strokes; generally about 7–26 px |
| Text | no baked card name, rule text, labels, or readable UI text |
| Raster embedding | forbidden: no `<image>` and no base64/embedded raster |
| External dependencies | none: no external fonts, images, scripts, or URLs |

Do not convert generated raster art into SVG wrappers. The visual must be authored as vector shapes following the existing files.

## 3. Palette and composition

### Coordination cards

Use the light pastel family established by `soothe.svg`, `guide.svg`, `voice.svg`, `polish.svg`, and `rush.svg`:

- pale blue / cream / mint / lavender / peach backgrounds;
- friendly or constructive symbolic scenes;
- dark muted outlines rather than black photographic detail;
- clear central silhouette that remains readable at card size.

### Event cards

Use the disruption/blocking family established by `overtime.svg` and `writer-block.svg`:

- darker, greyer, or more desaturated gradients;
- stronger contrast and obstruction / malfunction / interruption motifs;
- the same simplified geometry and rounded crayon strokes as coordination art.

Event art may still use a lighter muted background when the closest existing reference does so; `writer-block.svg` is the precedent.

## 4. Traceable references for the 2026-09-19 cards

| New asset | Existing references | Reason |
| --- | --- | --- |
| `one-on-one.svg` | `guide.svg`, `voice.svg` | two-person interaction + meeting/table composition |
| `inspiration.svg` | `polish.svg`, `rush.svg` | spark motif + energetic coordination palette/motion |
| `accident.svg` | `overtime.svg` | dark office disruption/event composition |
| `tech-failure.svg` | `writer-block.svg`, `overtime.svg` | device/desk motif + dark event palette |
| `thought-block.svg` | `writer-block.svg` | blocked-creation metaphor + muted event palette |

Each newly authored SVG should include a short source comment naming its reference SVGs so the visual lineage remains inspectable without reading commit history.

## 5. Implementation workflow

1. Read this file and inspect the named reference SVG(s).
2. Reuse the established 768×480 skeleton and texture filters.
3. Build the scene from simple vector primitives; do not start from raster image generation.
4. Render locally and inspect at both full size and card-sized scale.
5. Keep the content definition using `cardArt('<name>.svg')`.
6. Run the card-art style regression plus normal `typecheck`, `test`, and `build`.

A new visual category or alternate format requires an explicit specification update before assets are added.
''')

# 3) Add repository-wide reference-first gate and card-art pointer to AGENTS.md.
agents_path = ROOT / 'AGENTS.md'
agents = agents_path.read_text(encoding='utf-8')
reference_gate = '''## Reference-first implementation gate\n\n- **新增任何程式、UI、content、test、文件結構或 asset 前，先找 repository 內職責最接近的既有檔案作 reference。** 新增項目應延續既有 naming、目錄、schema、component pattern、測試方式與視覺格式，不得在未確認 reference 的情況下自行建立第二套做法。\n- 若真的沒有可對應的既有 reference，先把新的 convention / contract 寫入對應 canonical 文件並完成 review，再開始新增實作。\n- 同一類 asset 已有固定格式時，不得因工具方便改用另一種格式。例如 individual card art 已由 `public/assets/cards/*.svg` 建立慣例，就不得自行改成 WebP / PNG。\n- PR summary 應能指出重要新增項目的既有 reference；visual asset 應在 asset 或規格文件中保留可追溯 reference。\n\n'''
anchor = '## 部署與 public asset 路徑\n'
if '## Reference-first implementation gate' not in agents:
    agents = agents.replace(anchor, reference_gate + anchor, 1)
card_art_section = '''## 卡牌美術\n\n- Individual runtime card illustrations 使用 `public/assets/cards/*.svg`，canonical canvas 為 768×480（8:5）。\n- 新卡圖必須先指定現有 SVG reference，沿用既有 `paper` / `crayon` texture、粗圓角 stroke、簡化幾何構圖與既有 palette family。\n- 不得用 raster Image Generation 結果、WebP / PNG 或 `<image>` embedding 取代既有 individual-card SVG 畫風。\n- `coordination.png` / `event.png` 是 category/UI asset，不是 individual card illustration 的格式 precedent。\n- 詳細格式、reference mapping 與提交流程見 `CARD_ART_STYLE.md`。\n\n'''
anchor2 = '## 編碼與 shell\n'
if '## 卡牌美術' not in agents:
    agents = agents.replace(anchor2, card_art_section + anchor2, 1)
agents_path.write_text(agents, encoding='utf-8')

# 4) Replace the bad raster references with canonical SVG references.
cards_path = ROOT / 'src/content/cards.ts'
cards = cards_path.read_text(encoding='utf-8')
for old, new in {
    "cardArt('one-on-one.webp')": "cardArt('one-on-one.svg')",
    "cardArt('inspiration.webp')": "cardArt('inspiration.svg')",
    "cardArt('accident.webp')": "cardArt('accident.svg')",
    "cardArt('tech-failure.webp')": "cardArt('tech-failure.svg')",
    "cardArt('thought-block.webp')": "cardArt('thought-block.svg')",
}.items():
    if old not in cards:
        raise SystemExit(f'missing expected card art reference: {old}')
    cards = cards.replace(old, new)
cards_path.write_text(cards, encoding='utf-8')

# 5) SVG assets. Every source comment names the existing card-art references.
write('public/assets/cards/one-on-one.svg', r'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 480">
<!-- References: guide.svg (two-person guidance composition), voice.svg (discussion/table language). -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcecff"/><stop offset="1" stop-color="#f7e8c8"/></linearGradient>
  <filter id="crayon"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="soft-light"/></filter>
</defs>
<rect width="768" height="480" rx="28" fill="url(#bg)"/>
<g filter="url(#paper)" opacity=".22"><rect width="768" height="480" fill="#fff"/></g>
<g filter="url(#crayon)" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="384" cy="356" rx="208" ry="68" fill="#f5ddb4" stroke="#9e7651" stroke-width="12"/>
  <circle cx="245" cy="236" r="52" fill="#f0c6a5" stroke="#77584d" stroke-width="9"/>
  <circle cx="523" cy="236" r="52" fill="#f0c6a5" stroke="#77584d" stroke-width="9"/>
  <path d="M188 347 Q238 282 309 335" fill="#789fd0" stroke="#4f6d9a" stroke-width="11"/>
  <path d="M458 335 Q518 280 580 347" fill="#e9a47f" stroke="#a56548" stroke-width="11"/>
  <rect x="324" y="302" width="120" height="67" rx="12" fill="#e7edf2" stroke="#6f7d8d" stroke-width="9"/>
  <path d="M344 326 h80M344 345 h56" stroke="#a0adb9" stroke-width="7"/>
  <path d="M225 109 q0-34 43-34 h74 q43 0 43 34 t-43 34 h-31 l-26 27 5-27h-22q-43 0-43-34Z" fill="#fff" stroke="#8095ba" stroke-width="9"/>
  <path d="M424 111 q0-32 40-32 h72 q40 0 40 32 t-40 32 h-24 l18 24-34-24h-32q-40 0-40-32Z" fill="#fff7c9" stroke="#aa9a61" stroke-width="9"/>
  <path d="M260 110 h88M458 111 h80" stroke="#b4a8c4" stroke-width="8"/>
  <path d="M292 260 q36 26 73 14M476 259 q-36 26-72 15" fill="none" stroke="#725548" stroke-width="9"/>
</g>
</svg>
''')

write('public/assets/cards/inspiration.svg', r'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 480">
<!-- References: polish.svg (spark motif), rush.svg (energetic motion and warm coordination palette). -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0bd"/><stop offset="1" stop-color="#e5dcff"/></linearGradient>
  <filter id="crayon"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="soft-light"/></filter>
</defs>
<rect width="768" height="480" rx="28" fill="url(#bg)"/>
<g filter="url(#paper)" opacity=".22"><rect width="768" height="480" fill="#fff"/></g>
<g filter="url(#crayon)" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="384" cy="257" r="88" fill="#fff8bd" stroke="#d4a942" stroke-width="13"/>
  <path d="M344 253 Q384 195 424 253 Q431 294 404 317 H364 Q337 294 344 253Z" fill="#fff3a0" stroke="#bd8e34" stroke-width="10"/>
  <path d="M364 319 h40M370 338 h28" stroke="#8a6a36" stroke-width="9"/>
  <path d="M384 79 V132M246 132 l40 38M522 132 l-40 38M214 257 h58M496 257 h58M260 370 l38-36M508 370 l-38-36" stroke="#d68b4d" stroke-width="15"/>
  <path d="M168 170 l16 30 34 6-25 23 6 34-31-16-30 16 6-34-25-23 34-6Z" fill="#fff" stroke="#b49ad6" stroke-width="8"/>
  <path d="M600 158 l12 24 28 4-20 19 5 27-25-13-24 13 5-27-20-19 27-4Z" fill="#fff" stroke="#8fb6c9" stroke-width="8"/>
  <path d="M122 338 q64-62 130-12M646 338 q-64-62-130-12" fill="none" stroke="#7a9cc9" stroke-width="12"/>
</g>
</svg>
''')

write('public/assets/cards/accident.svg', r'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 480">
<!-- References: overtime.svg (dark event palette and office disruption composition). -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#33384f"/><stop offset="1" stop-color="#915f65"/></linearGradient>
  <filter id="crayon"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="soft-light"/></filter>
</defs>
<rect width="768" height="480" rx="28" fill="url(#bg)"/>
<g filter="url(#paper)" opacity=".22"><rect width="768" height="480" fill="#fff"/></g>
<g filter="url(#crayon)" stroke-linecap="round" stroke-linejoin="round">
  <path d="M138 370 h314 l36 54 H112Z" fill="#6f625d" stroke="#332f32" stroke-width="12"/>
  <path d="M245 236 l154 38-31 108-156-39Z" fill="#d8e2e6" stroke="#596875" stroke-width="11"/>
  <path d="M278 260 l89 22M265 293 l92 22" stroke="#8997a0" stroke-width="8"/>
  <path d="M468 150 l70 84M540 137 l-9 92" stroke="#f0c66f" stroke-width="15"/>
  <path d="M553 151 l43 16-35 28 8 45-42-24-40 24 8-45-35-28 44-16 13-42Z" fill="#f2b06e" stroke="#9a5945" stroke-width="10"/>
  <path d="M588 278 q58 18 74 78" fill="none" stroke="#d8edf4" stroke-width="13"/>
  <path d="M598 260 l52-18 14 37-53 18Z" fill="#f7f2e8" stroke="#8e8279" stroke-width="8"/>
  <path d="M132 182 l44-18 17 42-44 18Z" fill="#fff" stroke="#b5aaa1" stroke-width="8"/>
  <path d="M166 136 l39-24 24 38-39 24Z" fill="#fff" stroke="#b5aaa1" stroke-width="8"/>
  <path d="M115 260 q48-38 95 4" fill="none" stroke="#fff" stroke-width="10" opacity=".72"/>
</g>
</svg>
''')

write('public/assets/cards/tech-failure.svg', r'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 480">
<!-- References: writer-block.svg (desk/device composition), overtime.svg (dark event palette). -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#24354b"/><stop offset="1" stop-color="#66557d"/></linearGradient>
  <filter id="crayon"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="soft-light"/></filter>
</defs>
<rect width="768" height="480" rx="28" fill="url(#bg)"/>
<g filter="url(#paper)" opacity=".22"><rect width="768" height="480" fill="#fff"/></g>
<g filter="url(#crayon)" stroke-linecap="round" stroke-linejoin="round">
  <path d="M156 372 h430 l36 56H124Z" fill="#504b55" stroke="#292b36" stroke-width="12"/>
  <rect x="204" y="132" width="360" height="220" rx="20" fill="#9fb2c6" stroke="#37495f" stroke-width="13"/>
  <rect x="238" y="166" width="292" height="148" rx="10" fill="#dbe9ee" stroke="#657d91" stroke-width="9"/>
  <path d="M258 198 h86M370 198 h60M452 198 h55M272 239 h74M396 239 h102M250 281 h46M326 281 h90M448 281 h64" stroke="#7f6c96" stroke-width="11"/>
  <path d="M338 154 l44 60-34 15 38 72" fill="none" stroke="#ffd36c" stroke-width="16"/>
  <path d="M574 206 q64 20 48 78 q-12 42 35 56" fill="none" stroke="#d9d7e8" stroke-width="13"/>
  <path d="M650 341 l-28-6 15-25" fill="none" stroke="#d9d7e8" stroke-width="12"/>
  <path d="M126 173 q46-42 92 0M116 219 q57-44 112 0" fill="none" stroke="#fff" stroke-width="10" opacity=".65"/>
</g>
</svg>
''')

write('public/assets/cards/thought-block.svg', r'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 480">
<!-- References: writer-block.svg (blocked-creation metaphor and muted event palette). -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d1ccdf"/><stop offset="1" stop-color="#8694ad"/></linearGradient>
  <filter id="crayon"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="soft-light"/></filter>
</defs>
<rect width="768" height="480" rx="28" fill="url(#bg)"/>
<g filter="url(#paper)" opacity=".22"><rect width="768" height="480" fill="#fff"/></g>
<g filter="url(#crayon)" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="264" cy="255" r="72" fill="#efc3a2" stroke="#6f514a" stroke-width="11"/>
  <path d="M190 400 Q247 314 330 385" fill="#7a8ba5" stroke="#4d5b72" stroke-width="12"/>
  <path d="M231 245 q32-42 66 0M240 278 q24 22 48 0" fill="none" stroke="#6f514a" stroke-width="9"/>
  <path d="M358 126 Q420 88 452 140 Q478 184 438 215 Q400 246 450 282 Q500 319 458 367" fill="none" stroke="#5e6d86" stroke-width="18"/>
  <path d="M386 121 Q438 156 404 196 Q370 235 426 259 Q482 285 448 338" fill="none" stroke="#7a5f86" stroke-width="13"/>
  <rect x="520" y="104" width="84" height="274" rx="16" fill="#8e8799" stroke="#514b5d" stroke-width="12"/>
  <path d="M468 174 h50M472 240 h46M471 306 h47" stroke="#f3e9cf" stroke-width="11"/>
  <path d="M484 155 l32 19-32 19M488 221 l30 19-30 19M486 287 l32 19-32 19" fill="none" stroke="#f3e9cf" stroke-width="10"/>
  <path d="M630 150 q35 35 0 70M646 270 q35 35 0 70" fill="none" stroke="#fff" stroke-width="10" opacity=".65"/>
</g>
</svg>
''')

# 6) Strengthen automated style validation.
test_path = ROOT / 'src/tests/discussion-pr75-closeout.test.ts'
test = test_path.read_text(encoding='utf-8')
test = test.replace(
    "expect(CARDS[cardId]?.art, `${cardId} should have card art`).toMatch(/assets\\/cards\\/.+\\.(?:svg|webp|png)$/);",
    "expect(CARDS[cardId]?.art, `${cardId} should use canonical SVG card art`).toMatch(/assets\\/cards\\/.+\\.svg$/);",
)
test_path.write_text(test, encoding='utf-8')

write('src/tests/card-art-style.test.ts', r'''import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BASE_DECK, CARDS } from '../content/catalog';

const newReferenceMap: Record<string, string[]> = {
  'one-on-one.svg': ['guide.svg', 'voice.svg'],
  'inspiration.svg': ['polish.svg', 'rush.svg'],
  'accident.svg': ['overtime.svg'],
  'tech-failure.svg': ['writer-block.svg', 'overtime.svg'],
  'thought-block.svg': ['writer-block.svg'],
};

function readCardSvg(fileName: string): string {
  return readFileSync(resolve(process.cwd(), 'public/assets/cards', fileName), 'utf8');
}

describe('canonical individual card-art SVG contract', () => {
  it('keeps every Standard-deck card on the existing 768x480 textured SVG format', () => {
    for (const cardId of [...new Set(BASE_DECK)]) {
      const art = CARDS[cardId]?.art;
      expect(art, `${cardId} should expose art`).toBeTruthy();
      expect(art, `${cardId} should use SVG`).toMatch(/assets\/cards\/[a-z0-9-]+\.svg$/);

      const fileName = art!.split('/').at(-1)!;
      const source = readCardSvg(fileName);
      expect(source, `${fileName} should keep the canonical canvas`).toContain('viewBox="0 0 768 480"');
      expect(source, `${fileName} should keep paper texture`).toContain('id="paper"');
      expect(source, `${fileName} should keep crayon texture`).toContain('id="crayon"');
      expect(source, `${fileName} must not embed raster art`).not.toMatch(/<image\b/i);
    }
  });

  it('records existing SVG references for every card art added by this discussion update', () => {
    for (const [fileName, references] of Object.entries(newReferenceMap)) {
      const source = readCardSvg(fileName);
      expect(source).toContain('References:');
      for (const reference of references) expect(source).toContain(reference);
    }
  });
});
''')

# 7) Basic XML/source validation before TypeScript tests.
for svg_path in sorted((ROOT / 'public/assets/cards').glob('*.svg')):
    source = svg_path.read_text(encoding='utf-8')
    root = ET.fromstring(source)
    if root.attrib.get('viewBox') != '0 0 768 480':
        raise SystemExit(f'{svg_path}: unexpected viewBox')
    if '<image' in source.lower():
        raise SystemExit(f'{svg_path}: raster image embedding is forbidden')

for name in ['one-on-one.svg', 'inspiration.svg', 'accident.svg', 'tech-failure.svg', 'thought-block.svg']:
    source = (ROOT / 'public/assets/cards' / name).read_text(encoding='utf-8')
    if 'References:' not in source or 'id="paper"' not in source or 'id="crayon"' not in source:
        raise SystemExit(f'{name}: missing canonical style/reference markers')

print('PR #75 card-art SVG correction applied successfully.')
