# Bundled UI font

`noto-sans-tc-ui.woff2` is a project-specific subset of **Noto Sans TC Variable**.

- Upstream: Google Fonts / Noto Sans TC
- Pinned upstream commit: `b950a7257470b900078f2bf3223823a8602de7e1`
- License: SIL Open Font License 1.1; see `OFL.txt`
- Weights: 100–900
- Glyph set: ASCII plus all characters currently referenced by `src/**/*.{ts,tsx,css}` and `index.html`
- Purpose: deterministic Traditional Chinese rendering in local development, CI screenshots, and production

Regenerate with `bash scripts/vendor-ui-font.sh` after introducing new UI characters. CI verifies that the committed subset is current.
