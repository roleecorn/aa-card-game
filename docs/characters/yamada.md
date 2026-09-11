# 山田

## Source grounding

本角色採用 PintBox 對卡奧斯原案的修訂與確認版本。

- Stats：`Text 0 / Design 0 / AA 2`。
- Stress 上限：2。
- `電波跳躍`：第一回合各擲 3 顆 Text / Design 骰，只有結果 5、6 可以保留。
- `神隱`：當自己的 Stress 達到上限時，直接離場，之後無法繼續參與遊戲。

## Canonical runtime rules

- `電波跳躍` 於第一回合 `roundStart` 觸發一次。
- Text 與 Design 各獨立擲 3 次 `1d6`；只把 5、6 加入 pending dice，1–4 直接丟棄。
- `神隱` 在任何來源造成 Stress 達到 `maxStress` 的當下生效，不要求超過上限。
- 離場時從當前 team roster 移除山田，並清除他尚未分配的 pending dice；若山田原本是 Leader，改由仍在場的第一名組員接任。
- 山田的既有 Work 與已填進度保留，因此離場不會抹掉已完成的作品內容；因角色已不在 roster，之後自然不再行動、觸發技能或成為 member target。
- 山田沒有來源支持的作品適性，因此不自行補適性。

## Visual brief

原始討論未明確定義山田外貌；以下屬 **Prototype art direction**，不冒充 source-backed 外貌設定。

- 核心印象：訊號飄忽、突然出現又消失、偏技術／電波感，對應 `電波跳躍` 與 `神隱`。
- 單人角色 portrait；可採銀白短髮、寬鬆 hoodie、耳機或小型電子裝置等視覺語彙，表情略空白、像訊號斷線。
- 背景使用抽象電子雜訊、柔和螢光、模糊工作室器材；不能包含任何可閱讀文字、Logo、UI、卡框或數值。
- 標準 portrait：768×1024 WebP；compact：384×320 WebP，需獨立構圖而非機械裁切。
- 主體臉部與輪廓保持在中央 safe area，確保 CharacterCard responsive layout 不裁切重要特徵。
