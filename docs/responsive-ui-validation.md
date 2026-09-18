# Responsive UI validation

Branch: `codex/responsive-mobile-ui` (base `7f95e6c`).

## Scope

Presentation and local disclosure/scroll interactions only. No Engine, SkillRuntime, targeting validator, content data, Online commands, or tutorial scenario changes. No public asset paths or image binaries changed.

## Automated and browser checks

- `npm run typecheck`, `npm run test` (48 files / 244 tests), `npm run build` and `npm run test:tutorial` (5 tests) passed.
- Vite runtime, five-member Standard match: start dialog, roster confirmation and leader selection exercised at 390×844.
- Measured document scrollWidth equals clientWidth at widths 320, 768, 1280, 1600 and 1920. 390px also has no page-level horizontal overflow. Internal work-slot and hand scrolling is intentional.
- At 390px: performed Work, selected Ingrid Design 6, used Works navigation while selection remained active, placed the die in E's first slot and verified Design 6 appeared and selection cleared.
- At 320px: skill disclosure expands; Log opens above navigation; hand card confirmation is reachable. Entered card targeting, jumped to My Team, cancelled and verified both hand cards remained.
- Existing layout-source regression updated because fixed desktop flex layout is intentionally replaced by container-based auto-fit grid. These source assertions alone do not demonstrate browser layout; runtime checks above supply that evidence.

## Outstanding review gates

- Figma write blocked by Starter MCP call limit; no successful responsive canvas sync. Pending specification is in FIGMA.md.
- Real-device touch, landscape/keyboard behavior and complete guided tutorial UI walkthrough still require human testing. Tutorial deterministic Engine/store regressions passed; this does not claim a complete browser walkthrough.
- Online human two-end checklist in ONLINE_MULTIPLAYER.md still needs execution. No human review or merge authorization has been received.
- Production build emits its existing >500kB chunk advisory and third-party Zod annotation warnings; build succeeds.

## Human acceptance checklist

1. Test 3- and 5-member matches at 320/390px phone, 768px tablet and 1280/1600px desktop widths; rotate a physical phone and open/close dialogs with the keyboard visible.
2. Verify actions, skill disclosure, horizontal hand/slot scrolling and Log. Select a die/card/skill, use navigation, resolve a legal target and cancel another selection.
3. Complete Tutorial with its fixed roster and click restrictions; confirm targets and dialogs remain reachable.
4. Exercise Online as mobile Host and mobile Guest against a desktop peer, including opponent turn, timeout and disconnect restrictions.
5. Restore Figma access, sync responsive frames without raster uploads and complete design review before requesting merge separately.
