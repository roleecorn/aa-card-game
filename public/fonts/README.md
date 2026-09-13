# Bundled UI font

`noto-sans-tc-ui.woff2` is a project-specific subset of **Noto Sans TC Variable**.

- Upstream: Google Fonts / Noto Sans TC
- Pinned upstream commit: `b950a7257470b900078f2bf3223823a8602de7e1`
- License: SIL Open Font License 1.1; see `OFL.txt`
- Weights: 100–900
- Generator input: ASCII plus characters referenced by `src/**/*.{ts,tsx,css}` and `index.html`
- Purpose: deterministic Traditional Chinese rendering in CI and release builds, with the committed file also serving as a local-development baseline

`bash scripts/vendor-ui-font.sh` regenerates the subset for the current source tree.

CI and the GitHub Pages release workflow regenerate the font in their working tree before tests/builds. A source-code change therefore no longer has to commit a new binary font just to make CI pass. If the committed local-development baseline needs to be refreshed, run the script locally or use the manual `Vendor UI Font` workflow and replace the bundled file deliberately.

The CSS font stack includes system fallbacks, so a glyph missing from an older local baseline can still render until the baseline is refreshed.
