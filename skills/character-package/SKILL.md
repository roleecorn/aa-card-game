---
name: character-package
description: "Complete or modify a game character as one atomic package: source-grounded data, skill text, runtime effects, tests, and production portrait asset in the same commit."
---

# Character Package Skill

## Trigger

當任務涉及以下任何內容時使用：

- 新增角色
- 完成角色
- 修改角色數值或技能
- 補角色圖片
- 把角色從 planned 改成 implemented

## Required reading

開始前讀：

1. `AGENTS.md`
2. `CHARACTER_AUTHORING.md`
3. `CHARACTER_CARD_ART.md`
4. `SKILL_AUTHORING.md`
5. 該角色相關 `discussion-notes.md` / 原始 source

## Invariants

### Production asset, not mockup

使用者要求的是 runtime 美術素材時：

- 不生成 UI 示意圖。
- 不生成完整卡框。
- 不把文字、數值、技能烘焙到 image。
- portrait 與 React/MUI layer 永遠分離。

### Atomic character commit

角色 package 必須同一 commit 包含：

- data
- text
- runtime effect
- tests
- portrait

只要其中一項缺失，就不要宣稱角色已 complete，也不要先 push partial character commit。

### Source grounding

缺少的資料不能靠想像補成正式設定。

若 Prototype 必須填值：

- 明確標示 assumption。
- 寫到 `sourceNotes`。

## Workflow

1. 搜尋 source。
2. 決定 canonical character data。
3. 決定技能哪些是 implemented / partial / planned。
4. 用既有 generic effect vocabulary 實作。
5. 只有必要時增加 reusable mechanic。
6. 依美術規範生成正式 3:4 portrait。
7. 執行 `npm run art:normalize`。
8. 執行 `npm run art:validate`；必須通過尺寸、單幀與 RIFF 完整性檢查。
9. 寫 tests。
10. 一次建立 atomic Git commit。
11. validation branch 跑 CI。
12. 成功後 fast-forward 同一 commit 到 main。

## Failure handling

如果 Image Generation / test / effect implementation 尚未完成：

- 停在未提交狀態。
- 不把 CharacterDefinition 先送 main。
- 不說「已完成」。

如果已建立但未進 main 的 Git object / commit，只能描述為 staged / candidate，不得稱為已 commit 到 main。
