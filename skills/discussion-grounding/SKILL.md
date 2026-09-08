---
name: discussion-grounding
description: "Ground card-game rules and character data in the Discord source, separating source-backed facts from Prototype assumptions, later user decisions, and inference."
---

# Discussion Grounding Skill

## Trigger

當問題包含：

- 「根據之前的紀錄」
- 「Pintbox 怎麼說」
- 「Discord 裡有沒有」
- 「這個角色原本數值是什麼」
- 「這條規則是不是原設定」

或修改內容需要依據聊天紀錄時使用。

## Source priority

1. 原始 Discord export / 附件。
2. `discussion-notes.md`。
3. 角色 `sourceNotes`。
4. Prototype runtime 現況。

第 4 項不能反過來證明第 1 項已定案。

## Required distinction

回答與文件必須區分：

- **Source-backed**：來源明確支持。
- **Prototype assumption**：為可玩性補上的決策。
- **Later user decision**：使用者在後續開發對話中明確改定。
- **Inference**：必要推論，但來源沒有直接寫。

不要把 inference 改寫成原始 Discord 原文。

## Character data

如果原卡只列部分能力，例如只列 Design：

- 先搜尋是否其他訊息補完。
- 找不到時，可依專案慣例採 Prototype default。
- 必須寫 `sourceNotes` 說明缺失與採用值。

## Skill versions

若技能在討論中有早期／後期版本：

- 優先找最後明確修改。
- 文件保留「曾經是什麼、後來改成什麼」的脈絡。
- runtime 採用哪一版要明確寫出。

## Commit rule

如果 source audit 會導致角色內容修改，接著切換到 `character-package/SKILL.md`，遵守 atomic character commit。
