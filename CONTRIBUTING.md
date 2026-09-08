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

1. 先讀 `CHARACTER_AUTHORING.md` 與 `CHARACTER_CARD_ART.md`。
2. 在 `src/content/characters.ts` 新增角色資料。
3. 技能放到 `src/content/skills.ts`，優先使用既有 effect vocabulary。
4. 若新增全新 mechanic，依 `SKILL_AUTHORING.md` 擴充 schema / EffectRegistry / test。
5. 不在 Engine 或 UI 裡以角色 ID 寫分支。
6. 角色必須 atomic commit：數值、文本、runtime effect、tests、portrait 同一個 commit 完成。

## 新增卡牌

- 定義放 `src/content/cards.ts`。
- 優先共用 Skill System 的 effect vocabulary。
- 卡牌 runtime 插圖放 `public/assets/cards/`。

## Pull Request / Commit

- 不提交 build output 與依賴目錄。
- 將規則修改與單純 UI/美術重構分成可讀的 commit。
- 角色 package 不可拆成「先資料、後技能、再圖片」的多個 commit。
- 若規則來自討論但尚未定案，PR 說明中標記 assumption。
