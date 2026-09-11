---
name: character-package
description: "Complete or modify one game character with source-grounded data, runtime effects, tests, docs, and a valid image reference. Final artwork is optional; placeholder art is acceptable."
---

# Character Package Skill

## Trigger

當任務涉及以下任何內容時使用：

- 新增角色
- 完成角色
- 修改角色數值或技能
- 補角色圖片 reference
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
- 除非使用者明確要求 multi-character batch，否則不要把多名角色的 source analysis、runtime implementation、tests 或文件混在同一 execution batch。
- 若使用者給出角色清單，先完成第一名角色的完整邏輯，再進下一輪。

### Character completeness

角色程式碼要完整，但**正式角色圖不再是提交 blocker**。

角色提交至少應具備：

- source analysis / sourceNotes
- character data / metadata
- skill text
- 所有宣稱 implemented 的 runtime effect
- tests
- 必要 docs / integration
- 可解析的 portrait reference
- UI 需要時，可解析的 compactPortrait reference

若正式圖片尚未提供，**使用 placeholder / 代用圖即可**。不能留下 broken image path，但不需要等待 production art 才提交角色。

### Image upload boundary

**Chat / AI agent 不得自行把圖片 binary 上傳、替換或提交到 GitHub / repository。**

不得使用以下方式繞過：

- GitHub `create_blob` / `create_tree` / low-level Git object API
- Base64 staging file
- GitHub Contents API 傳 binary
- GitHub Actions decode binary 後 commit / push
- 為圖片傳輸建立 scratch / temporary branch
- 其他將 binary 經文字或 API payload 間接上傳的方式

Chat / AI agent 可以：

- 產生或整理候選圖片（若使用者要求）
- resize / crop / convert / validate
- 整理 portrait / compact 目錄
- 產生 ZIP、manifest、checksum
- 告知使用者正確 repo target path

圖片 binary 由使用者手動上傳。使用者完成上傳後，agent 可以繼續更新文字／程式 reference、驗證與處理 CI。

### Production asset rules

正式 runtime 美術若由使用者提供或已手動上傳，仍需符合：

- 不使用 UI mockup / 完整卡框當 portrait
- 不使用多人 card sheet / concept board 裁切成 production asset
- 不把角色名稱、數值、技能或 UI 烘焙到 image
- portrait 與 React/MUI layer 分離
- 標準 portrait 為 768×1024 WebP
- compact 為 384×320 WebP

placeholder / 代用圖只要求能正常顯示並符合 slot 行為，不要求符合最終角色 visual brief。

### Documentation gate before Image Generation

只有在使用者要求生成正式候選圖時才使用此 gate：

- 先分析當前角色 source。
- 將 visual brief、source-backed 視覺推導與 prototype art direction 寫入 repository 文件。
- 文件內容固定後才生成候選圖。
- 生成只處理當前角色，不混入其他角色。
- 完成後將檔案整理成 ZIP / 目錄交給使用者手動上傳。

Image Generation 與正式圖片上傳都**不是角色程式碼 commit 的必要條件**；已有 placeholder 即可完成角色實作。

### Source grounding

缺少的資料不能靠想像補成正式設定。

若 Prototype 必須填值：

- 明確標示 assumption。
- 寫到 `sourceNotes`。

## Workflow

1. 鎖定單一角色作為本輪 scope。
2. 搜尋 source。
3. 決定 canonical character data。
4. 決定技能哪些是 implemented / partial / planned。
5. 用既有 generic effect vocabulary 實作；只有必要時增加 reusable mechanic。
6. 完成 CharacterDefinition、SkillDefinition、runtime mechanic、tests 與必要 docs。
7. 確認角色已有可解析圖片 reference；正式圖未提供時使用 placeholder / 代用圖。
8. 執行 `npm run typecheck`、`npm run test`、`npm run build`。
9. gameplay / mechanic 變更必須同時執行 tutorial regression；若影響 selector/dialog/interaction，補 runtime UI 驗證。
10. commit / push 角色程式碼與文字變更。
11. 若使用者另外要求正式圖片，生成／整理／驗證後輸出 ZIP 或圖片檔並標示目標 repo path。
12. 使用者手動上傳圖片後，再執行 `npm run art:normalize` / `npm run art:validate` 與必要 CI。

## Failure handling

若角色資料、runtime skill implementation、tests 或必要 docs 尚未完成：

- 不宣稱 character implementation complete。
- 繼續完成程式邏輯或明確標示 remaining work。

若只有正式美術尚未完成：

- 不阻擋 character implementation。
- 使用 placeholder / 代用圖即可。
- 不把 placeholder 說成 final production art。

若 Image Generation 輸出 card sheet、多人拼圖或含 UI/text 的圖：

- 不將其當作正式 runtime asset。
- 重新整理候選圖或交付其他候選給使用者。
- 不自行上傳到 GitHub。

如果工具只能用 GitHub API 傳 binary：

- **不要傳。**
- 不建立 blob/tree/base64 staging/Actions decode workaround。
- 將圖片整理成可下載的 ZIP 或檔案，交由使用者手動處理。