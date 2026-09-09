# Character Authoring

本文件定義新增或完成角色時的完整工作流。

## Atomic package

**一個角色必須以一個 atomic commit 完成。**

同一個角色 commit 應同時包含適用的：

- CharacterDefinition
- stats / Stress / affinities / tags / resource
- SkillDefinition
- 真正 runtime effect
- tests
- `sourceNotes`
- 正式 portrait asset

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

若圖片或 mechanic 尚未完成，就不要把該角色宣稱為 complete。

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
4. 確認內容已 commit。
5. 才能生成候選圖。

聊天中的臨時描述不能取代 repository 文件。若先生成後補文件，視為流程違規；該圖片只能視為未採用 candidate，不可直接進 runtime。

角色視覺不要求與同批角色共用畫風。共通的是 runtime asset 技術規格；角色設計本身必須由各自 source 驅動。

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

建議先建立 temporary validation branch 指向完整 atomic commit，再跑 CI。

至少：

```bash
npm run typecheck
npm run test
npm run build
```

若使用 repo 的 `UI Screenshot` workflow，注意它驗證 typecheck/test/Vite render，但目前**不等於** production build。

驗證成功後 fast-forward 同一個 commit 到 `main`，不要另外加「修測試」commit 破壞 atomic character history。

## 7. Commit checklist

提交前確認：

- [ ] 角色資料來源已標明
- [ ] 缺失資料沒有被偽裝成 source-backed
- [ ] 所有 implemented 技能有 runtime effect
- [ ] 所有 implemented 技能有 test
- [ ] portrait 是正式 runtime asset
- [ ] portrait 實際存在於 Git tree
- [ ] `npm run art:validate` 已確認 WebP container 未被截斷
- [ ] CharacterDefinition path 與檔名一致
- [ ] atomic commit 同時包含 code + tests + image
