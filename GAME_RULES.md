# Current Game Rules

本文件描述 **目前 TypeScript runtime 實際採用的規則**。它不是 Discord 原始討論逐字整理；來源內容請看 `discussion-notes.md`。

每條規則應理解為以下其中之一：

- **Source-backed**：原始 Discord 討論已有明確依據。
- **Prototype decision**：為了讓目前 Prototype 可以執行而採用的專案決策。
- **Planned**：資料或文字已存在，但 runtime 尚未完整實作。

## Match setup

### Standard match

目前一般對局：

- 5 回合。
- 一隊 3 名角色。
- 從所有**沒有** `not-standard-playable` tag 的角色建立可出戰池。
- 先 shuffle 可出戰池。
- 我方取前 3 名。
- 對手再從**剩餘角色**取接下來 3 名。
- 同一局雙方角色不重複。
- 未抽到的角色本局不上場。
- 按「重開」會重新建立遊戲，因此重新抽隊伍。

目前 catalog：

- 一般可出戰：Pintbox、真白、79、旁白、銀櫻、藍風、三角希＆有希、風揚、高興。
- Boss / 非一般可出戰：卡奧斯。

三人隊伍與隨機抽隊屬於 **Prototype decision**，不是 Discord 原始規則已定案的選角系統。

## Works

每名上場角色建立一部自己的作品。

- 初始篇幅：5。
- 每個 progress slot 包含 `Design / Text / AA`。
- 目前 UI / engine 依 `Design -> Text -> AA` 工作。
- 同類型較高骰可以覆蓋較低骰。
- 最終每個 slot 以三項最低值計分。
- 缺少項目時按 -2。
- 作品篇幅可以被效果增加或減少。

作品類型：

`燃 / 謀 / 笑 / 情 / 色 / 怪`

角色自己的作品會從有效適性中選擇；全適性角色可使用全部類型。若目前角色沒有明確適性，Prototype fallback 為 `謀`。

## Character actions

一般角色每回合選擇：

- **Work**：依有效 `Design / Text / AA` 能力產生骰子，並增加 Stress。
- **Slack**：本輪不工作，回復 Stress。

Stress 的細節以 engine 為準；角色可有不同 `maxStress`。

當角色 Stress 已達 `maxStress` 時，本回合行動預設為 **Slack**。若玩家在規劃期間仍選擇 Work、但按下「進行創作」時角色已達上限，該次行動會自動轉為 Slack。

`maxStress: null` 表示沒有一般上限，例如高興。

### No-stress / special resource

特殊角色可以使用資料化 tag / resource，而不是以角色 ID 特判。

目前卡奧斯：

- `no-stress`：所有一般 Stress 變化無效。
- `resource: 體力`：初始 5、最大 5。
- `Boss 體力`：每回合結束體力 -1。
- `not-standard-playable`：不進一般 3v3 隨機池。

Boss mode 本身仍未完成；卡奧斯目前主要作為 content/runtime mechanic 驗證。

## Dice

骰值範圍為 1–6。

部分角色可透過 passive 設定最低骰值。例如：

- 風揚 `商業作者`：最低 3。
- 卡奧斯 `Boss 級穩定輸出`：最低 3。

## Cards

基礎牌庫目前為固定 12 張 Prototype deck。

### Coordination

目前包含：

- 安撫
- 指導
- 精修
- 重新考慮一下……
- 趕工
- 語音會議

統籌卡一般由 team-level 出牌流程處理。因 runtime 尚未保存「實際是哪一名角色使用這張卡」，角色級 `card.permission` 目前不能完整 enforce。

因此三角希＆有希的 `統籌權限` 仍標記為 `planned`。

### Event

目前包含：

- 突發加班
- 卡文

## Skills

技能採 data-driven pipeline：

```text
Game Event
  -> SkillRuntime
  -> Condition
  -> EffectRegistry / customEffects
  -> GameState
```

新增技能規則見 `SKILL_AUTHORING.md`。

## Source vs Prototype

若本文件與 `discussion-notes.md` 不同：

- `discussion-notes.md` 描述原始討論實際支持的內容。
- 本文件描述目前程式真正怎麼跑。
- `PROJECT_STATUS.md` 描述哪些部分仍缺漏或只是 Prototype。

不要為了讓文件一致而把 Prototype decision 回寫成「Discord 已定案」。
