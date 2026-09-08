# Character Card Art Specification

本文件定義角色卡的 runtime 美術規範。目標是讓未來新增角色時只需要新增一張符合規格的立繪與一份 `CharacterDefinition`，而不需要重新人工裁切卡框。

## 1. 核心原則

角色卡拆成兩層：

1. **角色立繪 asset**：純圖片，只負責角色視覺。
2. **React/MUI card frame**：名稱、Design/Text/AA、Stress、技能、按鈕與狀態全部由 UI render。

因此不要把完整卡片 UI 烘焙進 PNG/WebP。

## 2. Runtime asset 規格

| 項目 | 規格 |
| --- | --- |
| 格式 | WebP |
| Aspect ratio | 3:4 |
| 標準尺寸 | 768 x 1024 px |
| 最低建議尺寸 | 576 x 768 px |
| 色彩 | sRGB |
| Alpha | 非必要；目前允許不透明背景 |
| 檔名 | `character-id.webp` |
| 位置 | `public/assets/characters/` |

## 3. 構圖 safe area

以 768 x 1024 為基準：

- 頭頂至少離上緣約 8–10%。
- 雙眼與臉部中心建議落在畫面上半部的中央 60%。
- 左右重要輪廓不要貼近最外側 8%。
- 主要角色資訊盡量保留在中央約 70% 寬度。
- 允許背景被裁切；不允許裁掉頭部、主要表情或辨識角色的重要配件。

MUI component 應以完整 3:4 frame 顯示圖片，不以角色卡整體高度強迫 `cover`。

## 4. 禁止放進立繪的內容

以下內容全部由 UI render，不應出現在圖片本身：

- 角色名稱
- ID / 編號
- Design / Text / AA 數值
- Stress / HP 類 meter
- 技能名稱與技能敘述
- 陣營 badge
- 稀有度、卡框、按鈕
- 需要精確閱讀的文字

這可以避免 Image Generation 文字失真，也能讓同一份美術在手機、桌面與不同卡框中重用。

## 5. CharacterDefinition

角色資料只引用 asset：

```ts
{
  id: 'pintbox',
  name: 'Pintbox',
  portrait: '/assets/characters/pintbox.webp',
  stats: { design: 2, text: 0, aa: 2 },
  // ...
}
```

若未來確實需要少數例外，可增加資料化的 focus metadata，例如 `portraitPosition`；不要直接在 `CharacterCard.tsx` 依角色 ID 特判 CSS。

## 6. 生成流程

新角色建議流程：

1. 先決定角色的固定視覺描述與辨識元素。
2. 生成獨立角色 portrait，而不是生成一整張帶文字的卡牌。
3. 依 3:4 safe area 檢查頭部、臉、手與關鍵配件。
4. 轉成 WebP。
5. 放入 `public/assets/characters/`。
6. 在 `src/content/characters.ts` 引用。
7. 實際在 `CharacterCard` 的 desktop / narrow layout 檢查。

## 7. 本版重新生成素材

v0.4 將 Pintbox、79、真白、銀櫻、藍風、旁白改成重新生成後再依此規格整理的 3:4 WebP，移除舊版從 concept board 不規則裁切的 PNG。

縮小後的視覺設計參考放在：

`docs/art/character-card-reference.webp`

該圖僅供設計參考，不由 runtime 載入。
