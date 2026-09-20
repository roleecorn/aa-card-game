from pathlib import Path
import re


def replace(path: str, old: str, new: str, expected: int | None = None) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if expected is not None and count != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrences, found {count}: {old!r}')
    if count == 0:
        return
    p.write_text(text.replace(old, new), encoding='utf-8')


def remove_section(path: str, heading: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    pattern = rf'\n## {re.escape(heading)}\n.*?(?=\n## |\Z)'
    updated, count = re.subn(pattern, '', text, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{path}: expected one section {heading!r}, found {count}')
    p.write_text(updated.rstrip() + '\n', encoding='utf-8')

# Dedicated Figma workflow/spec is obsolete.
Path('FIGMA.md').unlink()

# Repository instructions: remove Figma as a source/review gate entirely.
remove_section('AGENTS.md', 'Figma')
remove_section('ACTION_FEEDBACK_CHANGELOG.md', 'Figma 對照')

replace(
    'README.md',
    '- Figma / Storybook workflow：[`FIGMA.md`](./FIGMA.md)\n',
    '',
    1,
)
replace(
    'VALIDATION.md',
    '角色內容仍遵守 atomic package 規則；runtime UI 驗證必須使用真正 Vite/Chrome screenshot，不以 Figma 代替。',
    '角色內容仍遵守 atomic package 規則；runtime UI 驗證使用真正 Vite/Chrome screenshot。',
    1,
)
replace(
    'skills/README.md',
    '- `runtime-ui-validation/SKILL.md`：取得真正程式 runtime UI，不以 Figma mockup 替代。',
    '- `runtime-ui-validation/SKILL.md`：以真正程式 runtime UI、browser rendering 與 screenshot 驗證畫面。',
    1,
)
replace(
    'skills/runtime-ui-validation/SKILL.md',
    'description: "Validate the actual React/Vite runtime UI with typecheck, tests, browser rendering, and screenshots; never substitute Figma or mockups for the running app."',
    'description: "Validate the actual React/Vite runtime UI with typecheck, tests, browser rendering, and screenshots."',
    1,
)

# Remove obsolete Figma-sync review gates/status paragraphs while retaining real-device/runtime gates.
for path in ['docs/responsive-ui-validation.md', 'PROJECT_STATUS.md']:
    p = Path(path)
    lines = p.read_text(encoding='utf-8').splitlines()
    kept: list[str] = []
    skip_paragraph = False
    for line in lines:
        if 'Figma' in line or 'figma' in line:
            # If a paragraph/list item is specifically about Figma, omit it.
            continue
        kept.append(line)
    p.write_text('\n'.join(kept).rstrip() + '\n', encoding='utf-8')

# Any remaining Figma mention is intentional evidence that this script missed a location.
remaining: list[str] = []
for raw in Path('.').rglob('*'):
    if not raw.is_file() or '.git' in raw.parts or raw.name in {'remove-figma.py'}:
        continue
    try:
        text = raw.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if re.search(r'figma', text, flags=re.I):
        remaining.append(str(raw))
if remaining:
    raise RuntimeError('remaining Figma references: ' + ', '.join(sorted(remaining)))
