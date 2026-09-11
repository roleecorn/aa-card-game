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
- Standard 可出戰池由 `src/content/match.ts` 的 match configuration 決定。
- 先 shuffle 可出戰池。
- 我方取前 3 名。
- 對手再從**剩餘角色**取接下來 3 名。
- 同一局雙方角色不重複。
- 未抽到的角色本局不上場。
- 按「重開」會重新建立遊戲，因此重新抽隊伍。

目前卡奧斯由 Standard match configuration 排除，不使用 `not-standard-playable` 之類 Character Tag 來承載這條規則。

三人隊伍與隨機抽隊屬於 **Prototype decision**，不是 Discord 原始規則已定案的選角系統。

### Leader

我方在抽隊後選擇一名組長；對手目前以 roster 第一名作為組長。

- 組長本局 Stress 上限 +2。
- 這個加成保存在當局 `CharacterState.statuses`，不修改全域 `CharacterDefinition.maxStress`。
- 因此不同對局、重新開始與未來平行 game session 不會共享組長加成。
- 若組長離場，從仍在場的組員中使用當局 RNG **隨機選擇一名接任組長**。
- 接任者取得組長的 Stress 上限加成；原本只有組長生效的卡牌限制也立即改以新組長判定。
- 若組長離場後已沒有任何可接任的組員，該隊**立即判負**，不再繼續該回合或進行一般分數結算。

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

當角色 Stress 已達有效 `maxStress` 時，本回合行動預設為 **Slack**。若玩家在規劃期間仍選擇 Work、但按下「進行創作」時角色已達上限，該次行動會自動轉為 Slack。

`maxStress: null` 表示沒有一般上限，例如高興。

### Special resource / persistent rules

角色可以使用 `CharacterState.resources` 保存非 Stress resource，並由 Skill / Effect runtime 定義其變化規則。

目前卡奧斯：

- `resource: 體力`：初始 5、最大 5。
- Skill「無壓力體質」在 `gameStart` 套用 `stress-immune` status，使一般 Stress 變化無效。
- Skill「Boss 體力」每回合結束體力 -1。
- Standard 3v3 是否可出戰由 match configuration 管理。

Boss mode 本身仍未完成；卡奧斯目前主要作為 content/runtime mechanic 驗證。

弱智的「不能行動／不能成為統籌目標／擔任組長時不能使用統籌卡」同樣由 Skill 在 `gameStart` 套用 runtime statuses，不由 Character Tag 直接控制。

## Character Tag rule

Character Tag 只作為 metadata 或 Skill selector / condition 的目標標示。

例如 `triangle-creature` 可讓「滾滾三角生物」用 `taggedMember` 找到合法目標；真正的 Stress -1 仍由該 Skill 的 `stress.change` effect 執行。

Tag 不得直接造成以下行為：

- 修改 Stress、骰子、能力或作品。
- 禁止／允許角色行動。
- 提供免疫。
- 控制卡牌使用或被指定權限。
- 決定 game mode 出場資格。

這些都必須由 Skill / Effect / runtime status 或 match configuration 明確實作。

## Dice

骰值範圍為 1–6。

部分角色可透過 passive 設定最低骰值。例如：

- 風揚 `商業作者`：最低 3。
- 卡奧斯 `Boss 級穩定輸出`：最低 3。

## Cards

基礎牌庫目前為固定 12 張 Prototype deck。

**所有卡牌一律視為由該隊當前組長使用。** UI / caller 不指定任意 card actor；Engine 從 `TeamState.leaderId` 推導出牌角色，並在 `cardPlayed` event 中記錄當下組長的 `actorId`。

因此：

- 組長專屬的卡牌限制一律檢查當前 `leaderId` 對應角色。
- 組長離場並由新組員接任後，之後的卡牌立即改視為由新組長使用。
- 「副組長力」只會在使用統籌卡時代替組長承擔 +1 外部壓力；它**不會改變出牌者 identity**。

### Coordination

目前包含：

- 安撫
- 指導
- 精修
- 重新考慮一下……
- 趕工
- 語音會議

統籌卡仍由 team-level hand / deck 管理，但使用者 identity 固定為當前組長。

三角希＆有希的統籌相關能力為共用 Skill「副組長力」；不再保留額外的 `triangleCoordination` / `card.permission` compatibility definition。

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

新增技能規則見 `SKILL_AUTHORING.md`；角色 Tag 與 Skill 的責任邊界見 `ARCHITECTURE.md` 與 `CHARACTER_AUTHORING.md`。

## Source vs Prototype

若本文件與 `discussion-notes.md` 不同：

- `discussion-notes.md` 描述原始討論實際支持的內容。
- 本文件描述目前程式真正怎麼跑。
- `PROJECT_STATUS.md` 描述哪些部分仍缺漏或只是 Prototype。

不要為了讓文件一致而把 Prototype decision 回寫成「Discord 已定案」。
