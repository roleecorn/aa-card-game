# Character Card Art Specification

本文件定義會直接進入 runtime 的角色美術素材規範。這些素材不是 UI mockup、角色圖鑑、concept board 或完整角色卡截圖。

## 1. 核心原則

角色卡拆成兩層：

1. **角色 portrait asset**：只負責角色與必要場景背景。
2. **React/MUI card frame**：名稱、Design/Text/AA、Stress、技能、按鈕、badge 與狀態全部由 UI render。

因此 portrait asset 不得烘焙任何卡片 UI。

**Runtime asset 必須是獨立生成的完整角色素材，不得由 concept board、角色卡 mockup、拼圖或其他多物件展示圖裁切取得。**


## 1.1 Image Generation 前置文件 Gate

**任何新的角色圖在開始 Image Generation 前，必須先把該角色的規格與 visual brief 寫入 repository 工作樹中的文件；但不得先單獨 commit 文件。**

這是硬性順序，不可倒置：

1. 先確認 source / 人設依據。
2. 在 `CHARACTER_CARD_ART.md` 或該角色專屬文件寫入固定 visual brief、構圖限制與 runtime asset 規格。
3. 文件內容必須先存在於 working tree，成為後續 Image Generation 的正式依據。
4. 之後完成角色設計、Image Generation、runtime skill implementation、tests、asset normalize / validate 與 integration。
5. **最後把文件、角色資料、技能、測試與正式圖片一起放進同一個 atomic character commit。**

前置文件 Gate 約束的是「先寫規格、再生成」的工作順序，不代表允許先建立 docs-only commit。

禁止：

- 先生成圖片，再回頭補文件。
- 先把文件單獨 commit，再把角色實作拆成後續 commits。
- 只在聊天訊息或 prompt 中定義規格，卻沒有寫入 repository。
- 未固定 visual brief 就反覆生成，導致同一角色外觀漂移。
- 為了配合已生成圖片而反過來修改 UI UX 或角色卡版面規格。

若使用者在同一任務中同時要求「新增角色」與「繪製角色圖」，也必須先完成上述文件 Gate。

## 1.2 Atomic character package

角色設計與角色圖不能作為獨立交付項拆開提交。對新增／完成角色而言，以下內容視為同一個不可分割的 package：

- source analysis / sourceNotes
- 角色設計與 visual brief 文件
- CharacterDefinition / stats / metadata
- SkillDefinition
- 所有宣稱 implemented 的 runtime skill effect
- tests
- 正式 portrait / compact asset（如該 UI 需要）
- asset normalize / validate 所需調整
- runtime integration 與必要文件更新

**上述 package 必須在同一個 atomic commit 中完成。**

若任何必要部分尚未完成：

- 不得提交 partial character commit。
- 不得只提交圖片。
- 不得只提交角色資料或技能文字。
- 不得只提交文件。
- 不得宣稱角色已完成或已可進 production。

候選圖片、未完成程式碼與草稿文件可以存在於 working tree / local candidate 狀態，但不能拆開推進 Git history。

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
| `meteor.webp` | 768×1024 | Valid WebP | canonical，source-driven 流星 portrait |
| `yashiro.webp` | 768×1024 | Valid WebP | canonical，source-driven 八代 portrait |
| `lemon.webp` | 768×1024 | Valid WebP | canonical，source-driven 檸檬 portrait |
| `emotion.webp` | 768×1024 | Valid WebP | canonical，source-driven 情緒 portrait |
| `avocado.webp` | 768×1024 | Valid WebP | canonical，source-driven 酪梨 portrait |

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
- **禁止以「同批角色維持一致畫風」作為角色設計目標。** 共通的只能是 runtime 技術規格，例如尺寸、比例、禁止文字/UI、safe area 與可讀性要求。
- 每個角色的造型、畫面語言、姿態、服裝、配色、構圖與氣氛都應優先由該角色自己的 Discord 發言、語氣、行為、創作傾向，以及其他人對其明確描述推導。
- 生成前必須先整理出足夠有區分度的 source evidence；若 visual brief 只是職業模板、顏色模板或同一人物換配色，視為不合格。
- 角色之間應有明顯不同的 silhouette、構圖節奏、表情、服裝邏輯與視覺重心；不要求共用相同 anime rendering style。
- 若 source 足以支持不同的媒材感或風格方向，可以讓不同角色採用不同的 illustration language，只要仍符合 runtime portrait 的技術規格。
- 若 source 沒有明確外觀設定，visual brief 只能作為 prototype art direction，不得在 `sourceNotes` 宣稱為原始 Discord 定案。
- compact asset 若需要，應依 compact UX 重新構圖，不可只把 portrait 機械裁成橫圖。


「normalized derivative」只表示 runtime format 已統一；若來源本身解析度較低，轉成 768×1024 不會憑空增加美術細節，也不得稱為新的高解析母版。


### 流星（METEOR）source-driven visual brief

- PintBox 已明確設計其卡面為「軌」與「副組長聖體」，因此視覺核心不是單純 meteor motif，而是「沿著軌跡快速推進、能接手統籌但不是主導型隊長」。
- dataset 中本人常以短句快速回應，並直接指出資訊一次塞太多、沒有消化時間；視覺可用強方向性線條、前傾姿態與移動感表現節奏敏感與行動性。
- Source-backed：副組長定位、燃作品技能、節奏敏感、直接反應。
- Prototype art direction：深色機能服、星軌／流星光跡、強透視動態構圖。
- 禁止依靠「METEOR」文字、技能字樣或 UI 建立辨識度；辨識應來自姿態、輪廓與動勢。

### 八代 source-driven visual brief

- PintBox 明確定義「可愛又好學」與減壓定位；本人在對話中同時呈現高互動性、鼓勵他人、提醒休息，以及主動深入查資料的傾向。
- 2026-09-04 PintBox 特別指出八代找資料深度遠超預期；本人也提到實地考察、老街古蹟、科學觀光與具體 AA 編輯細節。
- Source-backed：親和支援、主動研究、對團隊成員給予正向回饋、實際查證。
- Prototype art direction：開放姿態、帶研究／考察感的小道具、柔和但不幼兒化的表情；避免只用「可愛」作為唯一辨識特徵。

### 檸檬 source-driven visual brief

- 本人的長篇評論重點常落在故事核心、整體脈絡、角色銜接與觀眾對作品連貫性的預期；並直接提出即時溝通與預案的重要性。
- PintBox 另明確將她描述為較嚴格的組長，因此視覺重心應是「會在混亂前先整理結構的人」，不是單純 lemon motif。
- Source-backed：嚴格組長、結構審查、預案、即時溝通。
- Prototype art direction：整潔而有控制感的 silhouette、像在整理稿件／流程的姿態；黃色或綠色只能作次要辨識，不得成為唯一角色設計理由。

### 情緒 source-driven visual brief

- PintBox 明確指出情緒具備「可以簡單改善效果」的 AA 意識，因此視覺核心應是對細節與氣氛非常敏感，而不是把角色簡化成憂鬱或紫色系。
- 本人發言會快速判斷畫面／作品效果，也會直接對不合氣氛的 emoji 做反應，且常用強烈語氣表達自我界線。
- Source-backed：AA 呈現意識、氣氛敏感、直接評價、強烈自我感。
- Prototype art direction：表情與視線應有高感受度與觀察性，可使用局部對比與不對稱構圖表現情緒張力；避免套用固定「陰沉角色」模板。

### 酪梨 source-driven visual brief

- PintBox 對酪梨的核心描述是「有使用說明」與「先跑 code 理解能力邊界」，本人也明確整理技術職責、可追溯紀錄與流程規則。
- 本人對「做得到」與「適不適合做」有強烈區分，並經常指出修改成本、bug 與順序問題，因此角色核心是技術邊界與可操作性，而不是 avocado motif。
- Source-backed：使用說明、code、能力邊界、流程／順序、debug 與 implementation cost。
- Prototype art direction：研究／工程筆記、眼鏡與技術小道具可以使用；綠色只是輔助色，辨識度應來自「正在檢查與說明」的姿態。

## 8.2 Source-driven character differentiation

角色視覺必須是 **source-driven**，不是 batch-driven。

每個角色在生成前至少要整理：

- 該角色本人具有代表性的發言內容。
- 穩定出現的語氣、價值判斷或工作方式。
- 與其他角色明顯不同的行為特徵。
- PintBox 或其他人對該角色的明確描述。
- 能轉成視覺語彙的具體線索，例如：節奏感、混亂度、嚴謹度、社交性、技術性、戲劇性、審美偏好。

visual brief 必須回答：

1. 為什麼這個角色看起來應該是這樣？
2. 哪些 source 支持這個判斷？
3. 如果把名字遮住，和其他角色相比仍能否辨認出差異？
4. 哪些元素是 source-backed，哪些只是 prototype art direction？

禁止：

- 用同一套服裝版型只換配色。
- 每個角色都使用相同髮型結構、相同姿勢、相同表情或相同背景構圖。
- 因為「同一批」而強迫共用畫風。
- 只靠角色名稱做字面聯想，例如看到「檸檬」就只加入 lemon motif，而沒有對話人格依據。
- 在 source 區分度不足時直接生成正式 production portrait。

若 source evidence 還不夠形成有辨識度的 visual brief，應先繼續分析對話，不應先生成圖片。

`docs/art/character-card-reference.webp` 僅供版面設計參考，不得作為 runtime 圖片來源。

完整 implementation status 見 `PROJECT_STATUS.md`。
