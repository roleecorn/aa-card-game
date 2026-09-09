# Character Card Art Specification

本文件定義會直接進入 runtime 的角色美術素材規範。這些素材不是 UI mockup、角色圖鑑、concept board 或完整角色卡截圖。

## 1. 核心原則

角色卡拆成兩層：

1. **角色 portrait asset**：只負責角色與必要場景背景。
2. **React/MUI card frame**：名稱、Design/Text/AA、Stress、技能、按鈕、badge 與狀態全部由 UI render。

因此 portrait asset 不得烘焙任何卡片 UI。

**Runtime asset 必須是獨立生成的完整角色素材，不得由 concept board、角色卡 mockup、拼圖或其他多物件展示圖裁切取得。**


## 1.1 Image Generation 前置文件 Gate

**任何新的角色圖在開始 Image Generation 前，必須先把該批次的規格與角色 visual brief 寫入 repository 文件並 commit。**

這是硬性順序，不可倒置：

1. 先確認 source / 人設依據。
2. 在 `CHARACTER_CARD_ART.md` 或該角色專屬文件寫入固定 visual brief、構圖限制與 runtime asset 規格。
3. 將文件變更 commit 到目前開發 branch。
4. 文件 commit 完成後，才可開始 Image Generation。
5. 生成完成後再做 normalize、validate、runtime integration 與 UI verification。

禁止：

- 先生成圖片，再回頭補文件。
- 只在聊天訊息或 prompt 中定義規格，卻沒有寫入 repository。
- 未固定 visual brief 就反覆生成，導致同一角色外觀漂移。
- 為了配合已生成圖片而反過來修改 UI UX 或角色卡版面規格。

若使用者在同一任務中同時要求「新增角色」與「繪製角色圖」，也必須先完成上述文件 Gate。

## 2. Runtime asset 規格

| 項目 | 規格 |
| --- | --- |
| 格式 | WebP |
| Aspect ratio | 3:4 |
| Runtime 尺寸 | 768 x 1024 px |
| Compact slot 尺寸 | 384 x 320 px（僅需要橫向構圖的角色） |
| 生成母版 | 建議至少 768 x 1024；可使用更高解析度後等比例縮小 |
| 色彩 | sRGB |
| Alpha | 允許 RGB 或 RGBA；透明背景不是強制 |
| WebP encode | quality 82 / alphaQuality 90 / effort 6 / smartSubsample |
| Frame | 單幀；禁止 animated WebP |
| Container | RIFF 宣告長度必須等於實際檔案長度，禁止 truncated WebP |
| 檔名 | `character-id.webp` |
| 位置 | `public/assets/characters/` |

所有角色 runtime asset 必須具有完全相同的 pixel dimensions。**壓縮後 byte size 不要求相同**；WebP 檔案大小會隨畫面細節、透明區域與色彩複雜度改變。不得為了追求相同 KB 數而降低或填充圖片。

`compactPortrait` 是為主畫面橫向 slot 重新構圖的獨立素材，不得由 3:4 portrait 機械裁切或補邊。角色資料頁仍使用標準 `portrait`，compact 卡片優先使用 `compactPortrait`。

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
  portrait: '/assets/characters/portrait/pintbox.webp',
  compactPortrait: '/assets/characters/compact/pintbox.webp',
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


## 8.1 2026-09-09 新增角色批次 visual brief

以下 visual brief 必須在本批角色 Image Generation 前固定。圖片只表現角色本身與必要背景，不把這些說明文字畫進圖片。

| Character | Visual brief |
| --- | --- |
| 檸檬 | 嚴格但可靠的組長氣質；俐落、整潔、具管理感。可使用 lemon yellow / light green 作辨識色，但不可把「檸檬」文字畫進圖。 |
| 流星（METEOR） | 俐落、速度感、帶「燃」系舞台／流星動勢；可使用 deep blue / charcoal 搭配 orange-red highlight。應呈現副組長般的可靠與行動力。 |
| 情緒 | 敏銳、有意識、擅長觀察細節與改善呈現；視覺可偏 violet / muted blue / teal，氣質內斂、觀察型。 |
| 八代 | 可愛、好學、偏支援型，給人能降低團隊壓力的安心感；可使用 light blue / white / soft accent，姿態親和但不幼兒化。 |
| 酪梨 | 技術導向、條理清楚、像會整理使用說明與能力邊界的人；可使用 avocado green / cream / brown，允許眼鏡或文件／技術小道具。 |
| キツ | 冷靜、神秘、略帶銳利感；可使用 black / indigo / muted purple。允許低調 fox-like motif，但角色本身維持人類外觀。 |

### 本批共同限制

- 每張都是**獨立角色 portrait asset**，不是整張角色卡。
- 生成母版維持 3:4，最終 runtime canonical asset 為 768×1024 WebP。
- 頭部與上半身必須清楚可辨識，不能靠 UI 裁切來補救構圖。
- 背景保持簡潔，避免文字、Logo、UI、卡框、數值、技能說明。
- 同一批次應維持一致的 anime-inspired game-art rendering language、線條密度、光影與完成度。
- 角色之間必須有明確的色彩、髮型、服裝與 silhouette 區隔，不可只是同一人物換配色。
- 若 source 沒有明確外觀設定，visual brief 只能作為 prototype art direction，不得在 `sourceNotes` 宣稱為原始 Discord 定案。
- compact asset 若需要，應依 compact UX 重新構圖，不可只把 portrait 機械裁成橫圖。


「normalized derivative」只表示 runtime format 已統一；若來源本身解析度較低，轉成 768×1024 不會憑空增加美術細節，也不得稱為新的高解析母版。

`docs/art/character-card-reference.webp` 僅供版面設計參考，不得作為 runtime 圖片來源。

完整 implementation status 見 `PROJECT_STATUS.md`。
