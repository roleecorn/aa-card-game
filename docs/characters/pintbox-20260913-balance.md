# PintBox character balance batch — 2026-09-13

> **Status: merged into `main` via PR #58.**  
> 本文件現在是這批角色平衡工作的 decision record，不再代表仍處於 WIP / Draft。最新角色數值與技能仍以 `src/content/<character-id>.ts` 與對應 tests 為 authoritative source。

Resolution rule used by this batch:

`PintBox direct statements > statements explicitly accepted by PintBox > existing prototype`

同一角色若有多次明確設定，較新的設定覆蓋較舊設定。

## Resolved character decisions

### 格林 — `對托內利可的愛`

Final rule:

- Only while Grimm's own work is type `（情）`.
- Once per round.
- Choose any already-placed Design / Text / AA die in that work and set its value to `3`.
- Then Grimm's Stress `-1`.

This rule is an additional Grimm skill, not a replacement for `燃燒畫面`. Runtime keeps `grimmBurningFrame` for the original `燃燒畫面` behavior and registers `對托內利可的愛` separately as `grimmLoveForTonelico`.

### 三角希 — triangle-creature Stress behavior

Do **not** add or replace the current global Stress behavior. Keep the implemented triangle-creature Stress effects unchanged.

### 弱智 — final fill

Do **not** apply the proposed rule that changes the number of final filled slots based on remaining Stress.

Current rule remains `最後三天趕稿`：before final scoring, every empty Design / Text / AA progress cell in Weakzhi's own work independently rolls `1d6` and is filled.

## Characters added by this batch

The merged batch added the following character packages to the runtime catalog:

- 天體齒輪 (`tiantichilun`)
- TA (`ta`)
- Ingrid (`ingrid`)
- 橘天使 (`orangeangel`)
- E (`e`)
- 鈴嵐 (`linlan`)
- 二氧 (`eryang`)
- Pray (`pray`)
- 阿道 (`adao`)
- 滯澀 (`zhise`)
- 阿須 (`axu`)
- Enki (`enki`)
- 千鳥 (`chidori`)

The same batch also recalibrated multiple existing characters and added shared hidden-status / targeting support needed by those rules.

## Verification status after merge

The original WIP checklist in this document is historical. The merged implementation includes runtime handlers and regression tests for the character batch. Future regressions should be evaluated against the normal repository validation baseline rather than treating the items below as open blockers:

```bash
npm run typecheck
npm run test
npm run build
```

Gameplay changes must also keep the tutorial deterministic regression in scope, as required by `AGENTS.md`.

## Character art behavior

Character definitions point to their expected own asset paths under:

- `public/assets/characters/portrait/<character-id>.webp`
- `public/assets/characters/compact/<character-id>.webp`

Do not silently redirect a missing character asset to `narrator.webp` or another character. Missing / invalid assets should remain visible to development validation rather than being hidden by an unrelated character fallback.

For current project-wide roster and known gaps, see `PROJECT_STATUS.md`. For current gameplay rules, see `GAME_RULES.md` and `GAME_MANUAL.md`.
