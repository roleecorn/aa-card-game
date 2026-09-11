# 弱智

## Source grounding

本角色只採用 PintBox 在 2026-09-10 明確定義與後續確認的規則。

- 18:06:44（UTC+8）：PintBox 定義 `Text 1 / Design 1 / AA 1 / Stress 5`、適性（笑）、不能行動、不能成為統籌卡目標，並在結算前以 `1d6` 填充所有剩餘進度。
- 18:27:00（UTC+8）：PintBox 以「15d6」澄清：五格作品共有 15 個 Design / Text / AA cell；每個尚未填入的 cell 都要各自獨立擲 `1d6`，不是只擲一次後共用同一數值。
- 18:28:07–18:28:55（UTC+8）：PintBox 補充並再次確認：弱智即使擔任組長，也不能使用統籌卡；「不能當組長」並不是規則。

## Canonical runtime rules

- Stats：Design 1 / Text 1 / AA 1。
- Stress 上限：5。
- 適性：（笑）。
- `不能行動`：不能選擇創作或摸魚，因此不會由一般角色行動產生骰子或改變 Stress。
- `不能成為統籌卡目標`：只限制直接指定角色的 Coordination Card，不擴張成對所有隊友效果免疫。
- `組長時禁用統籌卡`：弱智仍可被選為 Leader，但該隊無法使用 Coordination Card。
- `最後三天趕稿`：最終回合的 `roundEnd`、正式計分之前，自己的作品中每個尚未填入的 Design / Text / AA cell 各自獨立擲 `1d6` 並填入；已存在的進度不覆寫。

這三種限制以 reusable character tags 表達，不在 `EngineSession` 以角色 ID 建立特判。

## Visual brief

Discord source 沒有明確定義角色外觀，因此以下造型屬 **Prototype art direction**，不冒充 source-backed 外貌設定。

- 核心印象：荒謬、停滯、最後期限前才突然完成大量內容，對應（笑）適性與「最後三天趕稿」。
- Portrait 採白色圓潤鳥型吉祥物，表情呆滯而誇張；周圍使用散亂空白紙張、桌面雜物與時鐘形成臨近 deadline 的場景語言。
- 不加入可閱讀文字、角色名稱、Logo、數值、技能說明或 card frame。
- 標準 portrait 為 768×1024 WebP；compact portrait 為獨立重新構圖的 384×320 WebP，不以標準 portrait 機械裁切。
- 兩張 runtime asset 都維持單幀 WebP、完整 RIFF container，並讓主要表情與輪廓留在 UI safe area。
