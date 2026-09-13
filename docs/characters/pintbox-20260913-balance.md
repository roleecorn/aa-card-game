# PintBox character balance batch — 2026-09-13

This branch is intentionally **WIP / not mergeable yet**.

Resolution rule: PintBox direct statements > statements explicitly accepted by PintBox > existing prototype; for the same character, later explicit settings override earlier ones.

## Merge blockers

The following three character topics are deliberately unresolved and must remain blockers before this PR can become Ready for review:

- 格林 `對托內利可的愛`: two alternatives were discussed and no final choice was made.
- 三角希 / triangle-creature global Stress effect: PintBox later said `先放著吧`; do not finalize it yet.
- 弱智 final-fill algorithm tied to remaining Stress: discussion remained unresolved; keep the last confirmed behavior for now.

Do **not** mark this PR Ready or merge it until these three items have explicit final settings.

## Scope being completed in parallel

- Existing-character balance changes other than the three blockers above.
- 13 new character definitions and their skills.
- Shared runtime support for hidden status, roll restrictions, rerolls, fixed dice and work-progress effects.
- Tests and catalog registration.
- Candidate portrait assets prepared separately for manual upload, in accordance with `CHARACTER_CARD_ART.md` (the agent does not upload image binaries).

## Art handoff

The 13 candidate portraits are prepared separately as 768×1024 3:4 WebP files. Until the user manually uploads those binaries, new character definitions should resolve to an existing valid fallback so runtime references stay parseable. After manual upload, switch each character to `public/assets/characters/portrait/<character-id>.webp` and the matching compact asset, then run `npm run art:normalize` / `npm run art:validate`.
