# Character Authoring

本文件定義新增或完成角色時的完整工作流。

## Execution model

角色 package 預設採 **一輪一角色**。除非使用者明確要求同一輪處理多名角色，否則每次執行只允許一名角色進入 source analysis、visual brief、runtime implementation、test、Image Generation、asset validation 與 commit 流程。

角色 package 必須以**真正的 Git working tree**作為 staging area：

```text
source / discussion grounding
  -> docs / visual brief 寫入 working tree（未 commit）
  -> character data / runtime / tests 寫入同一 working tree
  -> 生成或準備單一角色的 portrait / compact asset
  -> art normalize / validate
  -> typecheck / test / build / tutorial regression
  -> git diff 確認只含該角色 package
  -> 一次 atomic commit
  -> push branch / PR
```

不得把 GitHub Contents API 的逐檔 `create/update/delete` 當成角色 package 的主要 staging 流程，因為每次寫檔都會立即產生 commit，會破壞 documentation gate 與 single atomic commit。若工具限制只能先用逐檔 API 建 candidate，這些 commits 只能存在於 scratch branch；最後必須以 base commit 為 parent，使用完整 candidate tree 重建一個單一乾淨 commit，再由該 commit 建立正式 branch。不得 force-push 既有使用者 branch。

Binary WebP 必須直接存在於最終 Git tree，不能用 base64 文字檔、外部暫存 URL 或後補方式替代。

## Atomic package

**一個角色必須以一個 atomic commit 完成。**

同一個角色 commit 必須同時包含該角色完成所需的全部內容：

- source analysis / `sourceNotes`
- 角色設計與 visual brief 文件修改
- CharacterDefinition
- stats / Stress / affinities / tags / resource
- SkillDefinition
- 所有宣稱 implemented 的真正 runtime effect
- tests
- 正式 portrait asset
- compact portrait（若目前 UI 對該角色需要）
- asset normalize / validate 所需調整
- runtime integration 與其他必要文件修改

禁止：

```text
commit A: 先加角色數值
commit B: 補技能文字
commit C: 補圖片
```

應採：

```text
commit X: complete <character> character package
```

若圖片、角色設計、skill implementation、tests 或必要文件任一尚未完成，就不要 commit 該角色，也不要把該角色宣稱為 complete。

**禁止只實現 package 的一部分。** 例如「先加角色資料，圖片之後再補」、「先畫圖，技能之後再做」、「先寫文件，implementation 另開 commit」都屬於不合格的 partial delivery。

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
  portrait: '/assets/characters/example.webp',
  sourceNotes: [],
}
```

### Special tags / resource

目前 generic tags：

- `not-standard-playable`：不進 Standard match random roster。
- `no-stress`：忽略一般 Stress 變化。
- `duo-card`：美術 / content metadata，表示一張卡明確代表兩人。

特殊 resource：

```ts
resource: {
  name: '體力',
  max: 5,
  initial: 5,
}
```

runtime 存入 `CharacterState.resources`。

## 3. Skills

位置：

`src/content/skills.ts`

優先使用 declarative effect vocabulary。完整規則見 `SKILL_AUTHORING.md`。

禁止為單一角色在 `EngineSession` 寫角色 ID 特判。

如果 mechanic 可重用：

- 優先增加 generic effect / selector / condition。
- 高度特殊才用 `customEffects.ts`。

## 4. Portrait

必須先讀 `CHARACTER_CARD_ART.md`。

角色美術是**正式 runtime asset**，不是：

- UI mockup
- 完整卡牌截圖
- 角色圖鑑
- concept sheet
- card frame

目標：

- WebP
- 3:4
- 768×1024
- 無名稱 / 數值 / 技能 / Logo / UI
- 圖與文字分層
- 採用後執行 `npm run art:normalize`
- commit 前執行 `npm run art:validate`

雙人角色必須是同一張自然構圖的 portrait，不是兩張卡拼接。

### Image Generation documentation gate

新增或補角色圖片時，**在任何 Image Generation 發生前**必須：

1. 先從原始對話整理該角色具區分度的發言、語氣、行為與他人描述。
2. 將 source-backed 視覺推導、prototype art direction 與構圖限制寫入 `CHARACTER_CARD_ART.md` 或角色專屬文件。
3. 確認 visual brief 與其他角色有足夠區分度，且不是同一模板換色。
4. 確認這些文件修改已存在於 working tree，但**尚未單獨 commit**。
5. 只針對**當前這一名角色**生成候選圖；不要把其他待辦角色一起送入同一次生成。
6. 最後與角色 data / skill implementation / tests / production asset 一起 atomic commit。

聊天中的臨時描述不能取代 repository 文件。若先生成後補文件，視為流程違規；該圖片只能視為未採用 candidate，不可直接進 runtime。反過來，文件也不得提前單獨 commit；文件必須和完整角色 package 一起進同一個 commit。

角色視覺不要求與同批角色共用畫風。共通的是 runtime asset 技術規格；角色設計本身必須由各自 source 驅動。

如果 Image Generation 產生 card sheet、多人拼圖、完整卡框、含角色名稱／技能／數值的圖片，直接判定為不合格 candidate，不得靠裁切進 production；重新以單角色 portrait scope 生成。

## 5. Tests

至少測：

- stats / metadata
- portrait path
- 每個 implemented skill 的成功效果
- 必要的失敗 / 限制條件
- random mechanic 使用 deterministic RNG
- special resource / tag 行為

如果角色技能仍是 `planned`，測試應確認它仍明確標為 planned，不要假裝有 runtime behavior。

## 6. Validation

在 atomic commit 前，working tree 至少執行：

```bash
npm run art:normalize   # 有新增／替換角色圖時
npm run art:validate    # 有新增／替換角色圖時
npm run typecheck
npm run test
npm run build
```

任何涉及遊戲系統或能力機制的改動都必須包含 tutorial regression。若環境無法執行其中一項，必須明確標記為未驗證，不得把它寫成通過。

建議在完整 atomic commit 建立後，再用 temporary validation branch 指向**同一個 commit**跑 CI；CI 修正若會改變 package，應回到 working tree 修正並重新建立單一候選 commit，而不是在正式角色 branch 上連續補「fix test」commit。

驗證成功後再開 PR 或依 repository 流程整合；不要為了通過 CI 把角色 package 拆成多個正式 commits。

## 7. Commit checklist

提交前確認：

- [ ] 本輪只處理一名角色，或使用者已明確要求 multi-character batch
- [ ] 角色資料來源已標明
- [ ] 缺失資料沒有被偽裝成 source-backed
- [ ] visual brief 在 Image Generation 前已存在於 working tree
- [ ] Image Generation 僅針對當前角色，不是多人 card sheet / mockup
- [ ] 所有 implemented 技能有 runtime effect
- [ ] 所有 implemented 技能有 test
- [ ] portrait 是正式 runtime asset
- [ ] portrait 實際存在於 Git tree
- [ ] `npm run art:validate` 已確認 WebP container 未被截斷
- [ ] CharacterDefinition path 與檔名一致
- [ ] tutorial regression 已驗證（若改動涉及 gameplay）
- [ ] atomic commit 同時包含 sourceNotes + visual brief/docs + character data + skill implementation + tests + production image
- [ ] 正式 branch 沒有逐檔 Contents API 造成的 partial character commits
- [ ] 沒有任何「之後再補圖片／技能／文件／測試」的 partial delivery
