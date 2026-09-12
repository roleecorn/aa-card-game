#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_COMMIT="b950a7257470b900078f2bf3223823a8602de7e1"
UPSTREAM_BASE="https://raw.githubusercontent.com/google/fonts/${UPSTREAM_COMMIT}/ofl/notosanstc"

mkdir -p .font-cache public/fonts

python - <<'PY'
from pathlib import Path
from fontTools.ttLib import TTFont

roots = [Path("src"), Path("index.html")]
chars = set(chr(code) for code in range(0x20, 0x7f))
suffixes = {".ts", ".tsx", ".css", ".html"}
for root in roots:
    paths = [root] if root.is_file() else root.rglob("*")
    for path in paths:
        if not path.is_file() or path.suffix not in suffixes:
            continue
        chars.update(ch for ch in path.read_text(encoding="utf-8") if ord(ch) >= 0x20 and ch not in "\r\n\t")

font = TTFont("public/fonts/noto-sans-tc-ui.woff2")
supported = set()
for table in font["cmap"].tables:
    supported.update(chr(codepoint) for codepoint in table.cmap)
missing = "".join(sorted(chars - supported))
if missing:
    print(f"::error title=Missing UI font glyphs::{missing}")
PY

curl -fL "${UPSTREAM_BASE}/NotoSansTC%5Bwght%5D.ttf" -o .font-cache/NotoSansTC.ttf
curl -fL "${UPSTREAM_BASE}/OFL.txt" -o public/fonts/OFL.txt

python - <<'PY'
from pathlib import Path

roots = [Path("src"), Path("index.html")]
chars = set(chr(code) for code in range(0x20, 0x7f))
suffixes = {".ts", ".tsx", ".css", ".html"}

for root in roots:
    paths = [root] if root.is_file() else root.rglob("*")
    for path in paths:
        if not path.is_file() or path.suffix not in suffixes:
            continue
        text = path.read_text(encoding="utf-8")
        chars.update(ch for ch in text if ord(ch) >= 0x20 and ch not in "\r\n\t")

Path(".font-cache/ui-glyphs.txt").write_text("".join(sorted(chars)), encoding="utf-8")
print(f"Collected {len(chars)} unique UI characters")
PY

pyftsubset .font-cache/NotoSansTC.ttf \
  --text-file=.font-cache/ui-glyphs.txt \
  --output-file=public/fonts/noto-sans-tc-ui.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --name-IDs='*' \
  --name-legacy \
  --name-languages='*' \
  --notdef-glyph \
  --recommended-glyphs

cat > public/fonts/README.md <<EOF
# Bundled UI font

\`noto-sans-tc-ui.woff2\` is a project-specific subset of **Noto Sans TC Variable**.

- Upstream: Google Fonts / Noto Sans TC
- Pinned upstream commit: \`${UPSTREAM_COMMIT}\`
- License: SIL Open Font License 1.1; see \`OFL.txt\`
- Weights: 100–900
- Glyph set: ASCII plus all characters currently referenced by \`src/**/*.{ts,tsx,css}\` and \`index.html\`
- Purpose: deterministic Traditional Chinese rendering in local development, CI screenshots, and production

Regenerate with \`bash scripts/vendor-ui-font.sh\` after introducing new UI characters. CI verifies that the committed subset is current.
EOF

ls -lh public/fonts/noto-sans-tc-ui.woff2
