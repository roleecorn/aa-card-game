# PintBox character balance batch — 2026-09-13

This branch remains **WIP / Draft** while engineering verification is still in progress. The three character-design questions that originally blocked the PR are now resolved.

Resolution rule: PintBox direct statements > statements explicitly accepted by PintBox > existing prototype; for the same character, later explicit settings override earlier ones.

## Resolved character decisions

### 格林 — `對托內利可的愛`

Final rule:

- Only while Grimm's own work is type `（情）`.
- Once per round.
- Choose any already-placed Design / Text / AA die in that work and set its value to `3`.
- Then Grimm's Stress `-1`.

The runtime keeps the existing skill id `grimmBurningFrame` for compatibility, but the visible skill name and behavior are `對托內利可的愛`.

### 三角希 — triangle-creature Stress behavior

Do **not** add or replace the current global Stress behavior. Keep the currently implemented triangle-creature Stress effects unchanged.

### 弱智 — final fill

Do **not** apply the proposed rule that changes the number of final filled slots based on remaining Stress. Keep the currently implemented `最後三天趕稿` behavior unchanged: before final scoring, every empty Design / Text / AA progress cell in Weakzhi's own work independently rolls `1d6` and is filled.

These three items are no longer design blockers.

## Remaining WIP scope

- Finish runtime regression coverage for the newly added / adjusted characters.
- Verify shared hidden-status behavior and targeting restrictions.
- Verify fixed work-progress initialization such as 鈴嵐.
- Run the complete test / build pipeline and resolve any unrelated repository CI blockers.

## Character art behavior

The user has uploaded the character images. Character definitions must point directly to their own expected asset paths under:

- `public/assets/characters/portrait/<character-id>.webp`
- `public/assets/characters/compact/<character-id>.webp`

Do not redirect missing character assets to `narrator.webp` or another fallback character. If an expected file is missing, a development-time `404` is intentional because it exposes the integration error instead of hiding it.
