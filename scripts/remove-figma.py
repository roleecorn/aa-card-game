from pathlib import Path
import re
import subprocess


def remove_section_if_present(path: str, heading: str) -> None:
    p = Path(path)
    if not p.exists():
        return
    text = p.read_text(encoding='utf-8')
    pattern = rf'\n## {re.escape(heading)}\n.*?(?=\n## |\Z)'
    updated, _ = re.subn(pattern, '', text, flags=re.S)
    p.write_text(updated.rstrip() + '\n', encoding='utf-8')


def replace_if_present(path: str, old: str, new: str) -> None:
    p = Path(path)
    if not p.exists():
        return
    text = p.read_text(encoding='utf-8')
    if old in text:
        p.write_text(text.replace(old, new), encoding='utf-8')


# Dedicated visual-sync specification is obsolete.
figma_doc = Path('FIGMA.md')
if figma_doc.exists():
    figma_doc.unlink()

# Remove dedicated sections first so their continuation paragraphs do not become orphaned.
remove_section_if_present('AGENTS.md', 'Figma')
remove_section_if_present('ACTION_FEEDBACK_CHANGELOG.md', 'Figma 對照')

# Preserve the runtime-validation instructions while removing the obsolete comparison language.
replace_if_present(
    'skills/README.md',
    '- `runtime-ui-validation/SKILL.md`：取得真正程式 runtime UI，不以 Figma mockup 替代。',
    '- `runtime-ui-validation/SKILL.md`：以真正程式 runtime UI、browser rendering 與 screenshot 驗證畫面。',
)
replace_if_present(
    'skills/runtime-ui-validation/SKILL.md',
    'description: "Validate the actual React/Vite runtime UI with typecheck, tests, browser rendering, and screenshots; never substitute Figma or mockups for the running app."',
    'description: "Validate the actual React/Vite runtime UI with typecheck, tests, browser rendering, and screenshots."',
)
replace_if_present(
    'VALIDATION.md',
    '角色內容仍遵守 atomic package 規則；runtime UI 驗證必須使用真正 Vite/Chrome screenshot，不以 Figma 代替。',
    '角色內容仍遵守 atomic package 規則；runtime UI 驗證使用真正 Vite/Chrome screenshot。',
)

# Remove any remaining direct Figma references from tracked text files only.
# This catches stale status bullets / doc links without scanning node_modules created by npm ci.
tracked = subprocess.check_output(['git', 'ls-files'], text=True).splitlines()
excluded = {'scripts/remove-figma.py', '.github/workflows/remove-figma.yml'}
for name in tracked:
    if name in excluded or name == 'FIGMA.md':
        continue
    p = Path(name)
    if not p.exists() or not p.is_file():
        continue
    try:
        text = p.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if not re.search(r'figma', text, flags=re.I):
        continue
    lines = text.splitlines()
    cleaned = [line for line in lines if not re.search(r'figma', line, flags=re.I)]
    p.write_text('\n'.join(cleaned).rstrip() + '\n', encoding='utf-8')

# Fail closed if any tracked repository content still references Figma.
remaining: list[str] = []
for name in tracked:
    if name in excluded or name == 'FIGMA.md':
        continue
    p = Path(name)
    if not p.exists() or not p.is_file():
        continue
    try:
        text = p.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if re.search(r'figma', text, flags=re.I):
        remaining.append(name)
if remaining:
    raise RuntimeError('remaining Figma references: ' + ', '.join(sorted(remaining)))
