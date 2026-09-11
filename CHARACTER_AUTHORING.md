# Character Authoring

本文件定義新增或完成角色時的完整工作流。

## Execution model

角色 package 預設採 **一輪一角色**。除非使用者明確要求同一輪處理多名角色，否則每次執行只處理一名角色的 source analysis、runtime implementation、tests、文件與必要的 image reference。

角色程式碼應以真正的 Git working tree 作為 staging area：

```text
source / discussion grounding
  -> character data / runtime / tests / docs
  -> 確認角色有可解析的 portrait / compactPortrait reference
  -> 若正式圖片尚未提供，使用 placeholder / 代用圖
  -> typecheck / test / build / tutorial regression
  -> commit / push branch / PR
```

角色是否可提交，不再取決於正式美術是否完成。只要 runtime 不會出現 broken image path，即可使用 placeholder / 代用圖完成角色實作。

## Character delivery requirement

新增／完成角色時，以下內容應保持一致並可驗證：

- source analysis / `sourceNotes`
- CharacterDefinition
- stats / Stress / affinities / tags / resource
- SkillDefinition
- 所有宣稱 implemented 的真正 runtime effect
- tests
- 必要文件與 runtime integration
- 可解析的角色圖片 reference

### 圖片要求

- 每個角色必須有對應圖片 reference；不能留下不存在的 `portrait` / `compactPortrait` path。
- **不要求正式 production art 才能提交角色。placeholder / 代用圖即可。**
- placeholder 可以是專屬代用圖或既有共用 placeholder，只要 UI 能正常顯示且不會造成 broken asset。
- 正式 portrait / compact 可在角色程式碼提交之後，由使用者手動上傳與替換。
- 圖片是否為 placeholder 應在文件或 source note 中清楚標示，避免被誤認為最終美術。
- 正式圖片尚未上傳，不代表 character data / skill implementation / tests incomplete。

### Public asset path 規則

角色圖片位於 `public/assets/characters/`，但 `CharacterDefinition` 中的 reference **不得使用網站 root absolute path**。

正確：

```ts
portrait: 'assets/characters/portrait/example.webp',
compactPortrait: 'assets/characters/compact/example.webp',
```

錯誤：

```ts
portrait: '/assets/characters/portrait/example.webp',
```

本專案不假設 app 執行於 domain root。GitHub Pages、preview、reverse proxy 等環境都可能有 deployment base path，因此 browser URL 必須透過 Vite `import.meta.env.BASE_URL` 或 `resolvePublicAssetPath` 產生。

例如 deployment base 為 `/aa-card-game/` 時，canonical reference：

```text
assets/characters/portrait/example.webp
```

runtime 應解析成：

```text
/aa-card-game/assets/characters/portrait/example.webp
```

新增或修改 portrait reference 時，測試至少要覆蓋一個 non-root base；只在 localhost `/` 能顯示不算完成。

### Chat / AI agent 圖片上傳限制

**Chat / AI agent 不得自行把圖片 binary 上傳、替換或提交到 GitHub / repository。**

禁止使用以下方式繞過此限制：

- GitHub `create_blob` / `create_tree` / low-level Git object API
- Base64 staging file
- GitHub Contents API 傳 binary
- GitHub Actions 將 Base64 decode 後 commit / push
- 為圖片傳輸建立 scratch / temporary branch
- 其他將 binary 經文字或 API payload 間接塞入 GitHub 的方式

Chat / AI agent 可以：

- 生成或整理候選圖片（若使用者要求）
- resize / crop / convert / validate
- 整理 portrait / compact 目錄
- 產生 ZIP、manifest、checksum
- 告知使用者每個檔案應上傳到哪個 repo path

圖片 binary 由使用者手動上傳。使用者完成上傳後，agent 可以繼續修改文字／程式 reference、執行驗證與處理 CI。

## 1. 先做來源判定

先讀：

- `discussion-notes.md`
- 原始 Discord source（若需要確認）
- 已存在的角色 `sourceNotes`

把資料分成：

- 原始討論明確支持
- Prototype assumption
- 使用者後續明確決策

不要自行把缺失能力值、適性或技能數值當成來源已定案。

若必須為 Prototype 補值，必須寫入 `sourceNotes`。

## 2. CharacterDefinition

位置：

`src/content/characters.ts`

常見欄位：

```ts
{
  id: 'example',
  name: 'Example',
  stats: { design: 2, text: 1, aa: 0 },
  maxStress: 5,
  affinities: ['謀'],
  skillIds: ['exampleSkill'],
  portrait: 'assets/characters/portrait/example.webp',
  compactPortrait: 'assets/characters/compact/example.webp',
  sourceNotes: [],
}
```

若正式圖片還沒上傳，`portrait` 必須先指向 repo 中已存在的 placeholder / 代用圖，或使用專案既有 fallback 機制；不能先寫一個不存在的未來路徑。reference 必須保持 repository-relative，不得以 `/` 開頭。

### Tag policy

`tags` 只用來描述與辨識角色，或作為 Skill selector / condition 的目標條件。Tag **不得承載 gameplay effect**。

合法例子：

- `duo-card`：角色內容／美術 metadata。
- `triangle-creature`：讓 `taggedMember` 類 selector 找到合法技能目標。
- `leader`、`editorial`：UI / content 分類。

禁止用 Tag 表示：

- 不能行動。
- Stress 免疫。
- 卡牌使用／被指定權限。
- 能力值或骰子修改。
- Standard / Boss mode 是否可出戰。

上述規則都必須由 `SkillDefinition` 實現；需要持續存在的效果可以由 Skill 在 `gameStart` 或其他 trigger 使用 `status.change` 套到 `CharacterState.statuses`。Game mode eligibility 放在 `src/content/match.ts`。

不要新增 `no-stress`、`cannot-act`、`coordination-untargetable`、`coordination-disabled-as-leader`、`not-standard-playable` 這類 behavior tag。`validateCatalog()` 會拒絕它們進入 runtime catalog。

### Special resource

特殊 resource：

```ts
resource: {
  name: '體力',
  max: 5,
  initial: 5,
}
```

runtime 存入 `CharacterState.resources`。resource 本身只保存數值；會如何增減、免疫什麼效果，仍由 Skill / Effect runtime 定義。

## 3. Skills

位置：

`src/content/skills.ts` 或對應角色的 content module。

優先使用 declarative effect vocabulary。完整規則見 `SKILL_AUTHORING.md`。

禁止為單一角色在 `EngineSession` 寫角色 ID 特判，也禁止用 Character Tag 繞過 Skill system 實作效果。

如果 mechanic 可重用：

- 優先增加 generic effect / selector / condition。
- 持續性規則優先考慮由 Skill 套用 generic status。
- 高度特殊才用 `customEffects.ts`。

## 4. Portrait

正式美術規格見 `CHARACTER_CARD_ART.md`。

角色提交時只要求**有可顯示的圖片**；正式 runtime art 可以後補。placeholder / 代用圖不需要符合角色最終 visual brief，只需要：

- 檔案存在且可被 runtime 解析
- 不造成 broken image
- 尺寸／slot 行為不破壞 UI
- 不被文件誤標為 final production art

正式 portrait 的目標仍為：

- WebP
- 3:4
- 768×1024
- 無名稱 / 數值 / 技能 / Logo / UI
- 圖與文字分層

若 UI 使用 compact portrait，正式 compact 目標為 `384×320 WebP`。

### Image Generation documentation gate

只有在使用者要求生成正式候選美術時，才需要先完成 source-backed visual brief。這個 gate 約束的是「生成正式美術」的順序，**不是角色程式碼提交的 blocker**。

若需要生成圖片：

1. 先整理該角色 source。
2. 將 visual brief / prototype art direction 寫入文件。
3. 生成候選圖。
4. 本地整理成符合規格的 portrait / compact。
5. 交付 ZIP 或檔案給使用者。
6. **由使用者手動上傳到 GitHub。**

Chat / AI agent 不執行第 6 步。

角色視覺不要求與同批角色共用畫風。共通的是 runtime asset 技術規格；角色設計本身必須由各自 source 驅動。

## 5. Tests

至少測：

- stats / metadata
- portrait reference 可解析／fallback 規則正確
- public asset reference 為 repository-relative，且 non-root `BASE_URL` 可正確解析
- 每個 implemented skill 的成功效果
- 必要的失敗 / 限制條件
- random mechanic 使用 deterministic RNG
- special resource / runtime status 行為
- Tag selector / condition 若存在，測試 Tag 只負責選出效果對象
- runtime catalog 不包含 behavior tags

測試不應要求「一定是正式角色美術」；placeholder 是合法狀態。

如果角色技能仍是 `planned`，測試應確認它仍明確標為 planned，不要假裝有 runtime behavior。

## 6. Validation

角色程式碼修改至少執行：

```bash
npm run typecheck
npm run test
npm run build
```

若使用者已手動新增／替換圖片，再額外執行：

```bash
npm run art:normalize
npm run art:validate
```

任何涉及遊戲系統或能力機制的改動都必須包含 tutorial regression。若環境無法執行其中一項，必須明確標記為未驗證，不得把它寫成通過。

## 7. Commit checklist

提交前確認：

- [ ] 本輪只處理一名角色，或使用者已明確要求 multi-character batch
- [ ] 角色資料來源已標明
- [ ] 缺失資料沒有被偽裝成 source-backed
- [ ] 所有 implemented 技能有 runtime effect
- [ ] 所有 implemented 技能有 test
- [ ] Tag 只用於 metadata / target / condition，沒有直接承載 gameplay effect
- [ ] Game mode eligibility 沒有塞進 Character Tag
- [ ] `portrait` reference 可解析，不是 broken path
- [ ] UI 需要 `compactPortrait` 時，其 reference 也可解析
- [ ] `portrait` / `compactPortrait` 使用 repository-relative path，不以 `/` 開頭
- [ ] non-root deployment base 下圖片 URL 仍可正確解析
- [ ] 正式美術未完成時已使用 placeholder / 代用圖，不阻擋角色提交
- [ ] placeholder 沒有被誤標成 final production art
- [ ] CharacterDefinition path 與實際 asset / fallback 規則一致
- [ ] tutorial regression 已驗證（若改動涉及 gameplay）
- [ ] Chat / AI agent 沒有自行上傳或替換任何圖片 binary
- [ ] 若有正式新圖片，已整理為 ZIP / 檔案並交由使用者手動上傳
