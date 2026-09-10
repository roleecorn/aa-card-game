# 秋影

## Source grounding

本角色採用 2026-09-10 討論中卡奧斯提出、後由 PintBox 重新確認的卡面規格。

- Stats：Text 2 / Design 1 / AA 1。
- Stress 上限：3。
- `死線戰士`：遊戲開始時，自己的 Stress 為 3。
- `拖延症`：自己擲出的 1、2 不能使用。

目前來源沒有提供秋影的作品適性，因此 runtime 不自行補值，`affinities` 保持空集合。

## Canonical runtime rules

- 開局以 generic `gameStart` trigger 將 Stress 增加到 3，不在 engine 內以角色 ID 特判。
- `拖延症` 在自己的工作擲骰 batch 產生後立刻移除點數 1、2 的骰；這些骰不進 pending dice，因此 UI 不會提供無效骰給玩家。
- 因 Stress 上限也是 3，秋影在第一回合遵循現行共通規則被迫摸魚；不額外發明「滿 Stress 仍可行動」例外。

## Visual brief

原始討論沒有明確外貌設定，以下屬 Prototype art direction。

- 核心印象：長期拖延、睡眠不足、直到 deadline 才開始工作的創作者。
- 角色採年輕女性、深色長髮、明顯疲倦但仍保持專注的神情；姿勢可呈現趴桌、撐頭或半睡半醒。
- 場景為凌亂工作桌、散落草稿、冷掉的飲料、時鐘與夜間工作室光線，傳達 deadline 壓力。
- 圖中禁止任何可閱讀文字、Logo、卡框、角色名稱、數值、技能說明或 UI。
- 標準 portrait：768×1024 WebP；compact portrait：384×320 WebP，需維持臉部與主要輪廓在 safe area。
