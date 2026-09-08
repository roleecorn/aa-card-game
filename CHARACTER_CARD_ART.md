# Character Card Art Specification

本文件定義角色卡的 runtime 美術規範。目標是讓未來新增角色時只需要新增一張符合規格的立繪與一份 `CharacterDefinition`，而不需要重新人工裁切卡框。

## 1. 核心原則

角色卡拆成兩層：

1. **角色立繪 asset**：純圖片，只負責角色視覺。
2. **React/MUI card frame**：名稱、Design/Text/AA、Stress、技能、按鈕與狀態全部由 UI render。

因此不要把完整卡片 UI 烘焙進 PNG/WebP。

**Runtime asset 必須是獨立生成的完整角色物件，不得由 concept board、角色卡 mockup、拼圖或其他多物件概念圖裁切取得。**

## 2. Runtime asset 規格

| 項目 | 規格 |
| --- | --- |
| 格式 | WebP |
| Aspect ratio | 3:4 |
| 標準尺寸 | 768 x 1024 px |
| 最低建議尺寸 | 576 x 768 px |
| 色彩 | sRGB |
| Alpha | 建議透明背景；允許設計上必要的不透明背景 |
| 檔名 | `character-id.webp` |
| 位置 | `public/assets/characters/` |

所有角色 runtime asset 必須具有完全相同的 pixel dimensions；不得用 blurred padding、延伸背景、letterbox 或重複像素把錯誤比例硬補成 3:4。

## 3. 構圖 safe area

以 768 x 1024 為基準：

- 角色必須是單一、完整生成的 subject，不依賴周圍 concept board 內容。
- 頭頂至少離上緣約 8–10%。
- 雙眼與臉部中心建議落在畫面上半部的中央 60%。
- 左右重要輪廓不要貼近最外側 8%。
- 主要角色資訊盡量保留在中央約 70% 寬度。
- 不允許裁掉頭部、主要表情或辨識角色的重要配件。
- 若使用透明背景，角色輪廓必須完整，不可殘留其他卡片、文字、框線或鄰近角色。

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

新角色流程：

1. 先決定角色的固定視覺描述與辨識元素。
2. **直接生成該角色的獨立 portrait / character object；禁止先生成多人 concept board 再切割。**
3. 生成時以 3:4 composition 為目標，保留完整頭部、臉、手與關鍵配件。
4. 檢查 alpha 邊緣，不得包含鄰近物件或 concept-board 殘片。
5. 統一 resize 到 768 x 1024；只允許等比例縮放，不允許用 padding 修補錯誤構圖。
6. 轉成 WebP。
7. 放入 `public/assets/characters/`。
8. 在 `src/content/characters.ts` 引用。
9. 實際在 `CharacterCard` 的 desktop / narrow layout 檢查。

## 7. 既有素材遷移

v0.4 的六張角色圖雖然已整理成 3:4 WebP，但來源仍包含 concept-board / card mockup 的裁切，因此不符合本規範。

後續版本必須以**獨立生成角色物件**逐張替換 Pintbox、79、真白、銀櫻、藍風、旁白；替換完成前不得再宣稱這批素材為「重新生成後的標準角色素材」。

`docs/art/character-card-reference.webp` 僅供版面設計參考，不得作為 runtime 圖片來源。
