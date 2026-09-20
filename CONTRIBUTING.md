# Contributing

## Setup

```bash
npm install
npm run dev
```

提交前建議：

```bash
npm run verify
```

## Source grounding

- 規則或角色資料來自 Discord 時，先讀 `discussion-notes.md`，必要時回到原始 export。
- 必須區分 source-backed / Prototype assumption / later user decision。
- 缺失資料若使用 Prototype default，寫入角色 `sourceNotes`。

## 新增角色

1. 先讀 `CHARACTER_AUTHORING.md`、`CHARACTER_CARD_ART.md` 與 `ASSET_CONVENTIONS.md`。
2. 在 `src/content/<character-id>.ts` 建立／更新角色 package。
3. 技能與角色資料維持同一 package，優先使用既有 effect vocabulary。
4. 若新增全新 mechanic，依 `SKILL_AUTHORING.md` 擴充 schema / EffectRegistry / test。
5. 不在 Engine 或 UI 裡以角色 ID 寫分支。
6. data / skill / runtime / tests / docs 應一致；正式 binary art 可使用既有 placeholder 先完成程式提交，正式圖依 `AGENTS.md` 由使用者手動上傳。

## 新增卡牌

- 定義放 `src/content/cards.ts`。
- 優先共用 Skill System 的 effect vocabulary。
- 卡牌 runtime 插圖放 `public/assets/cards/*.svg`，並遵守 `CARD_ART_STYLE.md`。
- 新增任何既有 registry 之外的 asset family，先更新 `ASSET_CONVENTIONS.md`，不得先提交新格式再補規範。

## Pull Request / Commit

- 不提交 build output 與依賴目錄。
- 將規則修改與單純 UI/美術重構分成可讀的 commit。
- 角色 data / skill / runtime / tests / docs 不可拆成互相矛盾的半完成狀態；正式 binary art 依 repository 的人工上傳邊界獨立處理。
- 若規則來自討論但尚未定案，PR 說明中標記 assumption。
