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

## 新增角色

1. 新增符合 `CHARACTER_CARD_ART.md` 的 `public/assets/characters/<id>.webp`。
2. 在 `src/content/characters.ts` 新增角色資料。
3. 技能放到 `src/content/skills.ts`，優先使用既有 effect vocabulary。
4. 若新增全新 mechanic，依 `SKILL_AUTHORING.md` 擴充 schema / EffectRegistry / test。
5. 不在 Engine 或 UI 裡以角色 ID 寫分支。

## 新增卡牌

- 定義放 `src/content/cards.ts`。
- 優先共用 Skill System 的 effect vocabulary。
- 卡牌 runtime 插圖放 `public/assets/cards/`。

## Pull Request / Commit

- 不提交 build output 與依賴目錄。
- 將規則修改與單純 UI/美術重構分成可讀的 commit。
- 若規則來自討論但尚未定案，PR 說明中標記 assumption。
