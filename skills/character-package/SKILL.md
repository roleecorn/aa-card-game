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


### Documentation gate before Image Generation

在 workflow 的 Image Generation 步驟前，必須先完成：

- 先分析該角色 source，整理足夠有區分度的發言、語氣、行為與他人描述。
- 將角色獨立 visual brief、source-backed 視覺推導、runtime art constraints 與必要的 prototype art direction 寫入 repository 文件。
- 文件修改必須先存在於 working tree，但**不得先單獨 commit**。
- 文件內容固定後才可呼叫 Image Generation。
- 最後把 docs 與完整角色 package 一起 atomic commit。

禁止把 prompt 當作唯一規格來源，也禁止先生成再補文件。若順序違反，生成物只能視為 candidate，不能直接宣稱為 production asset。

不得要求同批角色使用一致畫風。若多個角色看起來像同一模板換色，必須回到 source 分析重做 visual brief。

### Atomic character commit

角色 package 必須同一 commit 包含：

- source analysis / sourceNotes
- character design / visual brief / docs
- character data / metadata
- skill text
- 所有 implemented skill 的 runtime effect
- tests
- production portrait
- compact portrait（如需要）
- normalize / validate / integration 所需調整

只要其中一項必要內容缺失，就不要宣稱角色已 complete，也不要先 push partial character commit。

不得接受「本次只做其中一部分」的角色完成方式。圖片生成、角色設計、技能實現、測試與文件修改是同一個 character package；若任一項尚未完成，整個 package 都保持未提交狀態。

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
6. 先將 visual brief 與角色規格寫入 repository working tree；此時不可單獨 commit。
7. 依已寫入文件的規格生成正式 3:4 portrait / 必要 compact asset。
8. 完成所有角色技能 implementation；不能只留下本次應完成的 mechanic 為 planned。
9. 執行 `npm run art:normalize`。
10. 執行 `npm run art:validate`；必須通過尺寸、單幀與 RIFF 完整性檢查。
11. 寫並完成 tests。
12. 確認 docs + design + data + skill runtime + tests + production art 全部齊備。
13. 一次建立唯一的 atomic character commit。
14. validation branch 跑 CI。
15. 成功後 fast-forward 同一 commit 到 main。

## Failure handling

如果 Image Generation / character design / docs / test / effect implementation 任一尚未完成：

- 整個 character package 停在未提交狀態。
- 不把 CharacterDefinition、SkillDefinition、docs 或圖片其中任何一部分先送 main。
- 不建立 partial character commit。
- 不說「已完成」。

如果已建立但未進 main 的 Git object / commit，只能描述為 staged / candidate，不得稱為已 commit 到 main。
