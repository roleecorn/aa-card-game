# Character Card Art Specification

本文件定義會直接進入 runtime 的角色美術素材規範。這些素材不是 UI mockup、角色圖鑑、concept board 或完整角色卡截圖。

## 1. 核心原則

角色卡拆成兩層：

1. **角色 portrait asset**：只負責角色與必要場景背景。
2. **React/MUI card frame**：名稱、Design/Text/AA、Stress、技能、按鈕、badge 與狀態全部由 UI render。

因此 portrait asset 不得烘焙任何卡片 UI。

**Runtime asset 必須是獨立生成的完整角色素材，不得由 concept board、角色卡 mockup、拼圖或其他多物件展示圖裁切取得。**

## 2. Runtime asset 規格

| 項目 | 規格 |
| --- | --- |
| 格式 | WebP |
| Aspect ratio | 3:4 |
| Runtime 尺寸 | 768 x 1024 px |
| 生成母版 | 建議至少 768 x 1024；可使用更高解析度後等比例縮小 |
| 色彩 | sRGB |
| Alpha | 允許 RGB 或 RGBA；透明背景不是強制 |
| WebP encode | quality 82 / alphaQuality 90 / effort 6 / smartSubsample |
| Frame | 單幀；禁止 animated WebP |
| Container | RIFF 宣告長度必須等於實際檔案長度，禁止 truncated WebP |
| 檔名 | `character-id.webp` |
| 位置 | `public/assets/characters/` |

所有角色 runtime asset 必須具有完全相同的 pixel dimensions。**壓縮後 byte size 不要求相同**；WebP 檔案大小會隨畫面細節、透明區域與色彩複雜度改變。不得為了追求相同 KB 數而降低或填充圖片。

不得用 blurred padding、letterbox、延伸背景或重複像素把錯誤比例硬補成 3:4。

## 3. 構圖 safe area

- 頭頂至少離上緣約 8–10%。
- 雙眼與臉部中心建議落在畫面上半部的中央 60%。
- 左右重要輪廓不要貼近最外側 8%。
- 主要角色資訊盡量保留在中央約 70% 寬度。
- 不允許裁掉頭部、主要表情、手或辨識角色的重要配件。
- 若使用透明背景，角色輪廓必須完整，不可殘留其他卡片、文字、框線或鄰近角色。
- 若使用場景背景，背景不得包含需要閱讀的文字、Logo 或介面元素。

MUI component 應保留完整 3:4 frame，不以角色卡整體高度強迫錯誤裁切。

## 4. 雙人 portrait

少數角色 definition 可以明確指定為雙人角色。這仍然是一張 portrait asset，而不是兩張卡拼接。

目前：

- `triangle.webp` = **三角 + 有希** 的雙人 portrait。
- 兩名角色都必須在同一張 3:4 畫面中完整可辨識。
- 之後若新增單獨的「三角」或「有希」角色，使用新的 character id 與新的單人 asset，不覆蓋 `triangle.webp`。

## 5. 禁止放進 portrait 的內容

以下內容全部由 UI render，不得出現在圖片本身：

- 角色名稱
- ID / 編號
- Design / Text / AA 數值
- Stress / HP / 體力 meter
- 技能名稱與技能敘述
- 陣營 badge
- 稀有度、卡框、按鈕
- Logo
- 需要精確閱讀的文字

## 6. CharacterDefinition

角色資料只引用 asset：

```ts
{
  id: 'pintbox',
  name: 'Pintbox',
  portrait: '/assets/characters/pintbox.webp',
  stats: { design: 2, text: 0, aa: 2 },
}
```

若少數角色需要調整 focus，可增加資料化 metadata，例如 `portraitPosition`；不要在 `CharacterCard.tsx` 依角色 ID 特判 CSS。

## 7. 生成與採用流程

1. 先讀本文件與 `AGENTS.md`。
2. 決定角色固定 visual brief 與辨識元素。
3. 直接生成獨立 3:4 portrait；禁止先做 UI mockup 再裁切。
4. 檢查人物 safe area、文字污染、鄰近物件與 alpha 邊緣。
5. 確認來源本身是 3:4；不要由轉檔工具裁切成 3:4。
6. 放入 `public/assets/characters/` 後執行 `npm run art:normalize`，統一成 768×1024 / sRGB / WebP canonical encoding。
7. 執行 `npm run art:validate`，確認尺寸、單幀與 RIFF 完整性。
8. 在 `src/content/characters.ts` 引用。
9. 實際用 `CharacterCard` desktop / narrow layout 驗證。
10. 採用後 commit 到 GitHub；候選稿不可宣稱已進 runtime。

## 8. 目前 roster 與完成狀態

| Asset | Runtime 尺寸 | Container | 備註 |
| --- | ---: | --- | --- |
| `pintbox.webp` | 768×1024 | Valid WebP | legacy-quality source 的 normalized derivative |
| `user79.webp` | 768×1024 | Valid WebP | legacy-quality source 的 normalized derivative |
| `mashiro.webp` | 768×1024 | Valid WebP | legacy-quality source 的 normalized derivative |
| `ginsakura.webp` | 768×1024 | Valid WebP | legacy-quality source 的 normalized derivative |
| `narrator.webp` | 768×1024 | Valid WebP | legacy-quality source 的 normalized derivative |
| `bluewind.webp` | 768×1024 | Valid WebP | legacy-quality source 的 normalized derivative |
| `happy.webp` | 768×1024 | Valid WebP | canonical |
| `triangle.webp` | 768×1024 | Valid WebP | canonical，三角希＆有希雙人 portrait |
| `fengyang.webp` | 768×1024 | Valid WebP | canonical |
| `chaos.webp` | 768×1024 | Valid WebP | canonical |

所有 runtime 檔案都已通過 `npm run art:validate`。

「normalized derivative」只表示 runtime format 已統一；若來源本身解析度較低，轉成 768×1024 不會憑空增加美術細節，也不得稱為新的高解析母版。

`docs/art/character-card-reference.webp` 僅供版面設計參考，不得作為 runtime 圖片來源。

完整 implementation status 見 `PROJECT_STATUS.md`。
