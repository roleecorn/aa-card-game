# Current Game Rules

本文件描述 **目前 `main` 的 TypeScript runtime 實際採用規則**。它不是 Discord 原始討論逐字整理；來源內容請看 `discussion-notes.md`，角色個別定義則以 `src/content/<character-id>.ts` 為準。

規則可分為：

- **Source-backed**：原始討論已有明確依據。
- **Prototype decision**：為了讓目前 Prototype 可執行而採用的專案決策。
- **Planned**：資料或文字已存在，但 runtime 尚未完整實作。

## Match setup

### Standard match

目前一般對局：

- 固定 5 回合。
- 開始遊戲後可選 **3 人模式**或 **5 人模式**。
- 隊伍有幾名角色，就建立幾部作品；因此 3 人模式每隊 3 部作品，5 人模式每隊 5 部作品。
- `src/content/match.ts` 的 `DEFAULT_MATCH.teamSize` 仍是 3，作為 Standard definition 的基準值；UI 選擇 5 人模式時會為該局建立 `teamSize: 5` 的 `GameDefinition`，不修改全域 catalog。
- Standard 可出戰池由 `src/content/match.ts` 的 match configuration 決定。
- 目前 catalog 共 **39 名角色**；Standard 排除卡奧斯，因此一般模式可抽取 **38 名角色**。
- 先 shuffle Standard 可出戰池。
- 我方依所選 team size 取前 3 或 5 名。
- 對手再從**剩餘角色**取接下來 3 或 5 名。
- 同一局雙方角色不重複。
- 未抽到的角色本局不上場。
- 按「重開」會重新建立遊戲，因此重新抽隊伍。

卡奧斯由 Standard match configuration 排除，不使用 `not-standard-playable` 之類 Character Tag 承載這條規則。

隨機抽隊與目前的 3 / 5 人模式皆屬 **Prototype decision**；不要把它回寫成 Discord 已定案的選角規則。

### Leader

我方在抽隊後選擇一名組長；對手目前以 roster 第一名作為組長。

- 組長本局 Stress 上限 +2。
- 這個加成保存在當局 `CharacterState.statuses`，不修改全域 `CharacterDefinition.maxStress`。
- 若組長離場，從仍在場的同隊成員中使用當局 RNG 隨機選擇一名接任組長。
- 接任者取得組長 Stress 上限加成；之後所有卡牌也立即視為由新組長使用。
- 若組長離場後沒有任何可接任成員，該隊立即判負。

## Works

每名上場角色建立一部自己的作品。

- 初始篇幅：5。
- 每個 progress slot 包含 `Design / Text / AA`。
- 放置順序為 `Design -> Text -> AA`。
- 同一 slot、同一 progress 類型中，較高骰可以覆蓋較低骰；相同或更低數值不能覆蓋。
- 最終每個 slot 以 `min(Design, Text, AA)` 計分。
- 缺少任一項時，缺項按 `-2` 參與最低值計算。
- 作品篇幅可以被效果增加或減少，最低不得低於 runtime 定義的合法值。

作品類型：

`燃 / 謀 / 笑 / 情 / 色 / 怪`

角色自己的作品會從有效適性中選擇；全適性角色可使用全部類型。若角色沒有 explicit affinity，也沒有被動提供適性，Prototype fallback 為 `謀`。

## Character actions

一般可行動角色每回合選擇：

- **Work**：依有效 `Design / Text / AA` 能力產生骰子，通常 Stress +1。
- **Slack**：本輪不工作，Stress -2。

當有限 Stress 上限角色在實際執行行動時已達有效上限，Work 會被強制轉成 Slack。

若某次 Stress 增加造成 `Stress > 有效上限`，該角色尚未分配的骰會被清除；若是該次 Work 本身造成超標，該批工作骰不會留下。剛好到達上限則不會追溯取消已產生的骰。

`maxStress: null` 表示沒有一般 Stress 上限，例如高興與卡奧斯。

### Hidden / 神隱

目前 runtime 已有共用 hidden gameplay status。被神隱的角色：

- 在 hidden 期間不能作為一般可行動角色操作；
- 依技能指定的 duration 決定何時恢復；
- 若技能明確指定「到遊戲結束」，則本局不再回場；
- 角色的作品不會因此自動刪除，仍可留待其他規則處理與最終計分。

目前 Ingrid、Pray、山田、滯澀等角色都會使用這套共用機制，但觸發時機與 duration 由各自 SkillDefinition 決定。

## Character Tag rule

`CharacterDefinition.tags` 只作為 metadata 或 Skill selector / condition 的目標標示。

Tag 不得直接：

- 修改 Stress、骰子、能力或作品；
- 禁止／允許角色行動；
- 提供免疫；
- 控制卡牌使用或被指定權限；
- 決定 game mode 出場資格。

上述 gameplay behavior 必須由 Skill / Effect / runtime status 或 match configuration 明確實作。

例如 `triangle-creature` 可以讓技能找到目標，但真正的 Stress 修改仍由該 Skill 的 effect 執行。

## Effect immunity 與 targetability

「效果無效」與「不能指定」是兩種不同規則：

- **效果無效**：目標仍合法；Skill / Card 正常發動，使用次數與卡牌消耗照常處理，只有落在免疫對象上的 effect 變成 no-op。
- **不能指定**：target validation 階段就不是合法目標，UI / runtime 不應讓玩家把該對象選成有效目標。

神惱「自己做」屬於效果無效：仍可被指定，但其他角色技能或卡牌造成在神惱本人的正面／負面修改不生效。

弱智的 `coordinationUntargetable` 屬於真正不能指定：直接指定角色的統籌卡不應把弱智列為合法角色目標。

## Dice

- 一般骰值範圍為 1–6。
- pending dice 在回合結束時不保留。
- 一般 pending dice 只能投入我方作品。
- 把骰投入其他組員作品時，Design / Text 需要符合骰子擁有者的有效作品適性；AA 不檢查適性。特定技能可建立例外骰或例外放置規則。
- 部分角色會修改可出現的骰面，例如風揚最低為 3；天體齒輪不會出現 3、4；嘆息與鬼影也有各自的禁骰面規則。

## Cards

基礎牌庫目前為固定 12 張 Prototype deck：

- 安撫 ×2
- 指導 ×2
- 精修 ×1
- 重新考慮一下…… ×1
- 趕工 ×1
- 語音會議 ×2
- 突發加班 ×2
- 卡文 ×1

每隊使用自己的 deck / hand / discard pile。

- 初始手牌 2 張。
- 第 2–5 回合開始時各抽 2 張。
- 手牌上限 8 張；我方超過上限時必須主動棄到 8 張才能繼續。
- 牌庫耗盡時會把棄牌堆洗回牌庫。

**所有卡牌一律視為由該隊當前組長使用。**

統籌卡成功使用後，一般由組長承擔 +1 外部 Stress；具有副組長相關技能的角色可能依各自 SkillDefinition 改變這個 Stress 承擔者，但不會因此改變 card actor identity。

### Coordination cards

目前包含：安撫、指導、精修、重新考慮一下……、趕工、語音會議。

### Event cards

目前包含：突發加班、卡文。

各卡牌的 target 與完整效果以 `src/content/cards.ts` 為 authoritative source；`GAME_MANUAL.md` 提供玩家向說明。

## Character-specific rules

角色資料採 per-character package：

`src/content/<character-id>.ts`

這裡的 `CharacterDefinition` / `SkillDefinition` 是角色數值與能力的 authoritative source。文件不要複製出另一套會獨立漂移的角色規則資料庫。

目前需要特別注意的 runtime 規則：

- **Pintbox**：「審稿」已是可主動使用的 implemented skill；「這只是基本的要求……」在 Pintbox Stress >= 3 時會自動重複處理低骰，不再是 partial。
- **弱智**：不能行動、不能成為直接角色目標的統籌卡 target；若擔任組長則不能使用統籌卡。最終仍以「最後三天趕稿」獨立 `1d6` 填空格。
- **格林**：「對托內利可的愛」目前是在自己的（情）作品上，每回合一次，把一顆已放置進度骰改成 3，再 Stress -1。
- **山田**：達到 Stress 上限會神隱到本局結束，而不是沿用一般角色的「只限制 Work」處理。
- **卡奧斯**：Standard 不出戰；其「體力」與 Stress immunity 仍保留作為 content/runtime mechanic。Boss mode 尚未完成。

目前仍明確標為 `planned` 的既有能力包含旁白與銀櫻的未完成技能；其他角色是否可操作、目標是否合法與能力如何結算，一律以目前 SkillDefinition / target validation 為準。

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

## Scoring and game end

第 5 回合的 `roundEnd` 與相關最終觸發完成後：

1. 每個作品 slot 取 Design / Text / AA 的最低值；缺項為 -2。
2. 作品分數為所有 slot 分數加總。
3. 隊伍分數為該隊所有作品分數加總。
4. 高分者勝；同分為平手。

若較早發生「組長離場且無人可接任」的立即敗北，則不再走一般分數比較。

## Source vs Prototype

若文件之間內容不同：

1. `src/content/`、`src/game/` 與對應 tests 描述目前程式真正怎麼跑。
2. `GAME_RULES.md` 是 runtime 規則摘要。
3. `GAME_MANUAL.md` 是玩家向說明。
4. `discussion-notes.md` 保留來源討論與歷史脈絡，不應被誤當成目前 runtime snapshot。
5. `PROJECT_STATUS.md` 記錄目前仍存在的 gap / planned scope。

不要為了讓文件一致而把 Prototype decision 回寫成「Discord 已定案」。
