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

### One character per execution

- 預設**一輪只處理一名角色**。
- 除非使用者明確要求 multi-character batch，否則不能同時把多名角色帶進 source analysis、visual brief、Image Generation、runtime implementation、tests 或 commit。
- 若使用者給出角色清單，先完成第一名角色的完整 package，再進下一輪。

### Real working tree required

- `docs / character data / runtime code / tests / binary assets` 必須共同存在於真正的 Git working tree，且在最終提交前保持未 commit。
- 不得把 GitHub Contents API 的逐檔 `create/update/delete` 當主要 staging 流程；每次寫檔都會產生 commit，會破壞 documentation gate 與 atomic package。
- 若執行環境只有 Git object API，允許先建立 candidate blobs/tree，再以目標 base commit 為唯一 parent 建立一個乾淨 commit；正式 branch 從該 clean commit 建立，不 force-push scratch history。
- Binary WebP 必須直接存在於最終 Git tree，不能以 base64 文字檔或外部 URL 替代。

### Production asset, not mockup

使用者要求的是 runtime 美術素材時：

- 不生成 UI 示意圖。
- 不生成完整卡框。
- 不生成多人 card sheet / concept board。
- 不把文字、數值、技能烘焙到 image。
- portrait 與 React/MUI layer 永遠分離。
- 若生成結果包含多角色、卡框、角色名稱、能力值、技能文字或其他 UI，直接視為不合格 candidate，不得靠裁切轉為 production asset。

### Documentation gate before Image Generation

在 workflow 的 Image Generation 步驟前，必須先完成：

- 先分析**當前這一名角色**的 source，整理足夠有區分度的發言、語氣、行為與他人描述。
- 將角色獨立 visual brief、source-backed 視覺推導、runtime art constraints 與必要的 prototype art direction 寫入 repository working tree 中的文件。
- 文件修改必須先存在於 working tree，但**不得先單獨 commit**。
- 文件內容固定後才可呼叫 Image Generation。
- Image Generation 只處理當前角色，不帶入其他待辦角色的完整卡面資訊。
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

1. 鎖定**單一角色**作為本輪唯一 scope。
2. 搜尋 source。
3. 決定 canonical character data。
4. 決定技能哪些是 implemented / partial / planned。
5. 用既有 generic effect vocabulary 實作；只有必要時增加 reusable mechanic。
6. 先將 visual brief 與角色規格寫入 local / cloud Git working tree；此時不可單獨 commit。
7. 完成 CharacterDefinition、SkillDefinition、runtime mechanic 與 tests，但仍保持 working tree 未 commit。
8. 依已寫入文件的規格，只生成當前角色的正式 3:4 portrait / 必要 compact asset。
9. 將 binary asset 放到正確 repository path。
10. 執行 `npm run art:normalize`。
11. 執行 `npm run art:validate`；必須通過尺寸、單幀與 RIFF 完整性檢查。
12. 執行 `npm run typecheck`、`npm run test`、`npm run build`。
13. gameplay / mechanic 變更必須同時執行 tutorial regression；若影響 selector/dialog/interaction，補 runtime UI 驗證。
14. `git diff` 確認 working tree 只包含當前角色 package 與其必要 reusable mechanic。
15. 一次建立唯一的 atomic character commit。
16. 由該 commit 建立／更新正式 feature branch 並跑 CI。
17. CI 失敗時回到 working tree 修正並重建候選 clean commit；不要在正式 branch 疊加 partial/fix commits。
18. 驗證成功後開 PR 或依 repository 流程整合。

## Failure handling

如果 Image Generation / character design / docs / test / effect implementation 任一尚未完成：

- 整個 character package 停在未提交 working tree / candidate 狀態。
- 不把 CharacterDefinition、SkillDefinition、docs 或圖片其中任何一部分先送 main。
- 不建立 partial character commit。
- 不說「已完成」。

如果 Image Generation 輸出 card sheet、多人拼圖或含 UI/text 的圖：

- 不裁切沿用。
- 不修改 UI 來遷就錯誤圖片比例或構圖。
- 回到當前角色 visual brief，以單角色 portrait scope 重做。

如果工具只能逐檔修改 GitHub：

- 只能在 scratch branch 建 candidate。
- 最後必須從 base + 完整 tree 重建一個 clean atomic commit。
- 正式 branch 不保留 scratch partial history。

如果已建立但未進 main 的 Git object / commit，只能描述為 staged / candidate，不得稱為已 commit 到 main。
