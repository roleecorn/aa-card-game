# Tutorial architecture

Tutorial 是一個建立在一般 `GameState` / `EngineSession` 上的固定 scenario，不是另一套 game engine。

## State ownership

每一局 Tutorial 的可變控制狀態都放在 Zustand 的 `TutorialRuntimeState`：

```ts
interface TutorialRuntimeState {
  step: TutorialStepId | null;
  randomIndex: number;
}
```

這個物件必須保持 JSON-serializable。不要用 module-level variable、React component local state 或 closure 保存 Tutorial progression / deterministic RNG cursor。

## Scenario and controller

`scenario.ts` 是 Tutorial flow 的單一來源：

- guide title / purpose / instruction
- highlight selector
- semantic event -> next step transition

`App.tsx` 只回報 semantic events，例如 `actionChanged`、`skillResolved`、`cardResolved`、`diePlaced`。UI 不得根據目前 step 自己決定下一個 step。

`reduceTutorialEvent()` 是 pure controller：不符合當前 step 預期的 event 必須被忽略；成功、失敗、取消 dialog 等 retry flow 也由 scenario transition 定義。

## Deterministic RNG

`runtime.ts` 使用 `TutorialRuntimeState.randomIndex` 取得固定骰值。每個 Tutorial session 都有自己的 cursor，因此不同對局不會共享 RNG progress，reset / replay 也不需要清理 process-global state。

## Fixture config

`config.ts` 只保存固定測試／教學資料，例如：

- player / enemy roster
- player / enemy deck order
- deterministic die sequence
- tutorial-only fixed card / skill targets

不要把 progression 規則或 runtime mutable state 放回 `config.ts`。

## UI guide

`TutorialGuide.tsx` 只負責呈現 `TUTORIAL_SCENARIO[step]`、highlight 與 click restriction。它不持有 scenario progression；`introOpen` / measured DOM rect 等純 presentation state 可以留在 component local state。
