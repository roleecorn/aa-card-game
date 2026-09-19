# Current Game Rules

本文件描述 **目前 `main` 的 TypeScript runtime 實際採用規則**。它不是 Discord 原始討論逐字整理；來源內容請看 `discussion-notes.md`，角色個別數值／能力則以 `src/content/<character-id>.ts` 為 authoritative source。

規則可分為：

- **Source-backed**：原始討論已有明確依據。
- **Prototype decision**：為了讓目前 Prototype 可執行而採用的專案決策。
- **Planned**：資料或文字已存在，但 runtime 尚未完整實作。

## Match modes

目前有兩種可玩的對戰入口：

- **Standard AI**：玩家對 AI。
- **Online**：兩名真人透過房間代碼連線對戰。

兩者共用同一套 `GameDefinition`、角色／技能／卡牌資料與 `BattleRoom` gameplay UI，但**開局選角與回合控制方式不同**。

### Shared match constants

目前 Standard definition 的主要規則：

- 固定 **5 回合**。
- 可選 **3 人模式**或 **5 人模式**。
- 每名上場角色建立一部自己的作品，所以每隊作品數等於隊伍人數。
- 初始作品篇幅 5。
- 初始手牌 2；第 2–5 回合開始時抽 2。
- 手牌上限 8。
- 組長有效 Stress 上限 +2。
- 缺少 Design / Text / AA 的 slot 項目以 `-2` 參與計分。

`src/content/match.ts` 的 `DEFAULT_MATCH.teamSize` 為 3，只是 Standard definition 的基準值；3/5 人模式會為該局建立對應的 `GameDefinition`，不修改全域 catalog。

## Standard AI setup

目前 runtime catalog 共 **39 名角色**。一般 Standard / Online 可出戰池只排除：

- 卡奧斯 `chaos`：Boss / special content，目前不進一般 Standard / Online roster。

因此目前一般 Standard / Online 可選池為 **38 名角色**。旁白 `narrator` 與銀櫻 `ginsakura` 雖仍含 `planned` 技能，仍保留在一般可選池，方便實機、整合與回歸測試；`planned` 狀態本身不構成 roster exclusion。

Standard 開局：

1. Shuffle Standard 可出戰池。
2. 我方依 team size 取前 3 或 5 名。
3. 對手從剩餘角色取接下來 3 或 5 名。
4. 雙方角色不重複。
5. 我方看到初始隊伍後，全局只有 **一次重抽機會**：選一名我方角色，以當局尚未參戰的可出戰角色替換。
6. 確認隊伍後，我方選擇組長。
7. 對手以 roster 第一名作為組長。

Standard 的隨機抽隊、單次重抽與 3/5 人模式皆屬 Prototype decision。

## Online setup and draft

Online 不使用 Standard 的「抽隊 → 單次重抽 → 選組長」流程。

Host：

1. 進入「連線對戰」→「建立連線房間」。
2. 先選擇 3 人或 5 人模式。
3. 建立 6 位數房間代碼。

Guest：

1. 進入「連線對戰」→「加入連線房間」。
2. 輸入 Host 的 6 位數代碼。

連線完成後進入共同角色選擇：

- 3 人模式：候選池 6 名不同角色，選擇順序 `Host 1 → Guest 2 → Host 2 → Guest 1`。
- 5 人模式：候選池 10 名不同角色，選擇順序 `Host 1 → Guest 2 → Host 2 → Guest 2 → Host 2 → Guest 1`。
- 候選角色來自同一個 Standard playable pool，因此只排除 Chaos；旁白與銀櫻仍可出現在候選池。
- 已被選走的角色立即失去再次選取資格，並在選角 UI 中由中央候選池移往對應隊伍欄。
- **每一方第一個選到的角色就是該隊組長**。
- 每個選角批次共用一條 **15 秒** Host-authoritative timer；2-pick batch 的第一個 pick 不會重設時間。
- Initial reveal 完成前不開始該 side 的首次選角倒數；後續飛行／落點動畫不暫停 timer。
- 選角批次逾時時，Host 依候選 pool 順序自動補完該批仍缺少的角色。
- 最後一張角色卡的移動／落點動畫完成後，才進入正式對局，避免視覺流程被 BattleRoom transition 截斷。

離開／關閉連線設定畫面會視為中斷該次連線流程；不能把關閉 Dialog 當成「連線仍在背景繼續」。

完整 transport、timer authority 與連線限制見 `ONLINE_MULTIPLAYER.md`。

## Turn flow

### Standard AI

一般每回合：

1. `roundStart` 技能／狀態。
2. 抽牌（第 2 回合起）。
3. 玩家規劃每名可行動角色的 Work / Slack。
4. 執行玩家角色行動並產生 pending dice。
5. 玩家放骰、出牌、使用主動技能。
6. 結束配置；玩家未使用 pending dice 清除。
7. AI 執行技能／卡牌、Work / Slack 與自動放骰。
8. `roundEnd` 技能／狀態。
9. 進入下一回合，或第 5 回合後結算。

### Online human-vs-human

Online 使用同一 GameState，但兩邊都由真人操作：

1. Host side：`player-plan → player-assign`。
2. Host 完成配置後進入 Guest side：`enemy-plan → enemy-assign`。
3. Guest 完成配置後執行共用 roundEnd / cleanup / draw / roundStart，進入下一回合 Host turn。
4. 每個 `plan` 與 `assign` phase 都有獨立的 **90 秒** Host-authoritative deadline；phase 內出牌、技能、Work / Slack 選擇與放骰都不會重設時間。
5. 倒數最後 10 秒進入 warning 狀態。
6. Plan 逾時時，Host 以該 side 當下已選的 Work / Slack 結算；沒有另行變更的角色沿用目前預設，達有效 Stress cap 的角色仍由正常規則強制 Slack。
7. Guest 的 Plan 選擇會以 `planPreview` 同步到 Host，只有 Host 能做真正的 timeout resolution。
8. Assign 逾時時，Host 走正常 `finishOnlineAssignment()`，清除尚未使用的 pending dice 並切換 phase。
9. 若 timeout 發生時該 side 手牌仍超過上限，Host 先隨機棄掉恰好超出的張數，再執行 Plan / Assign timeout resolution。
10. Online phase 改變會清除尚未確認的 card / skill / targeting / selected-die UI 暫存，不允許半完成操作跨 phase 殘留。

Host 是 authoritative state owner，也同時擁有 authoritative timer deadline；Guest 傳 command / Plan preview，由 Host 先檢查 deadline、再驗證與結算並同步 snapshot。Timer 使用 absolute deadline，因此 background throttling 不會延長規則時間；Guest 顯示倒數不具 authority。

Standard AI 與 Tutorial **不啟用** Online rope timer。

## Leader

- 組長有限 Stress 上限 +2。
- 所有卡牌 actor 都是該隊**當前組長**。
- 副組長類能力只能改變「統籌卡 +1 Stress 的承擔者」，不改變 card actor identity。
- 若組長離場，Engine 從仍在場的同隊成員中使用當局 RNG 隨機選擇接任者。
- 接任者取得組長 Stress cap bonus；之後所有卡牌立即由新組長使用。
- 若組長離場後無人可接任，該隊立即判負。

Online 的第一個 draft pick 只決定**初始組長**；之後的接任規則與 Standard 相同。

## Works

每名上場角色建立一部自己的作品。

- 初始篇幅：5。
- 每個 slot 包含 `Design / Text / AA`。
- 空 slot 放置順序為 `Design → Text → AA`。
- 同一 slot、同一 progress 類型中，較高骰可以覆蓋較低骰；相同或更低不能覆蓋。
- 每個 slot 最終以 `min(Design, Text, AA)` 計分。
- 缺少任一項時，缺項按 `-2` 參與最低值計算。
- 作品篇幅可被效果增減，最低為 1。

作品類型：`燃 / 謀 / 笑 / 情 / 色 / 怪`。

角色自己的作品會從有效適性中選擇；全適性角色可使用全部類型。若角色沒有 explicit affinity，也沒有被動提供適性，Prototype fallback 為 `謀`。

## Character actions and Stress

一般可行動角色每回合選擇：

- **Work**：依有效 `Design / Text / AA` 產生骰子，通常 Stress +1。
- **Slack**：不工作，Stress -2。

若有限 Stress 上限角色在實際執行行動時已 `Stress >= 有效上限`，Work 會被強制轉成 Slack。

若 Stress 增加造成 `Stress > 有效上限`：

- 該角色尚未分配的 pending dice 清除。
- 若是這次 Work 本身造成超標，該批工作骰不留下。
- 剛好到達上限不會追溯取消已產生的骰。

`maxStress: null` 表示沒有一般 Stress 上限，例如高興與卡奧斯。

### Hidden / 神隱

Hidden 是共用 gameplay status：

- hidden 角色不能執行一般 Work / Slack。
- hidden / action-blocked 角色也不能手動發動 Active skill。
- hidden 角色不能成為直接角色目標的統籌卡 target。
- 作品不會因角色 hidden 自動刪除。
- duration 由各 SkillDefinition 決定；若技能指定到遊戲結束，就不會回場。

## Dice

- 一般骰值為 1–6。
- pending dice 不保留到下一回合。
- 一般 pending dice 只能投入己方作品。
- 把骰投入其他組員作品時，Design / Text 需要骰子擁有者對該作品類型有有效適性；AA 一般不檢查適性。
- 特定技能可建立例外放置規則。

部分角色修改合法骰面：

- 風揚：最低骰面 3。
- 天體齒輪：不會出現 3、4。
- 嘆息：Text / AA 不會出現 5、6。
- 鬼影：Design / AA 不會出現 5、6。
- 秋影：「拖延症」會讓自己擲出的 1、2 無法使用；這條規則同時適用一般工作骰與技能／卡牌取得的額外骰。

## Cards

基礎牌庫固定 12 張：

- 安撫 ×2
- 指導 ×2
- 精修 ×1
- 重新考慮一下…… ×1
- 趕工 ×1
- 語音會議 ×2
- 突發加班 ×2
- 卡文 ×1

每隊使用自己的 deck / hand / discard pile。

- 初始手牌 2。
- 第 2–5 回合開始時抽 2。
- 手牌上限 8。
- 牌庫耗盡時把棄牌堆洗回牌庫。
- 真人正常操作時若超過上限，需棄到 8 張才能繼續；Online rope timeout 若遇到仍超量的手牌，會由 Host 隨機棄掉恰好超出的張數後再推進 phase。

所有卡牌都由當前組長使用。統籌卡成功使用後，一般由組長承擔 +1 外部 Stress；副組長能力可能依規則在**結算前**改變 Stress bearer。

各卡牌完整 target / effect 以 `src/content/cards.ts` 為 authoritative source；玩家向說明見 `GAME_MANUAL.md`。

## Skills and target legality

技能採 data-driven pipeline：

```text
Game Event
  -> SkillRuntime
  -> Condition / usage / target legality
  -> EffectRegistry / customEffects
  -> GameState
```

### Active skills

`SkillRuntime` 是 Active skill 可用性與 target legality 的單一 runtime source of truth：

- `activeTarget` 描述目標結構與 relation / skill / minValue / maxValue 等限制。
- `activeCondition` 描述真正的發動前置條件，例如作品類型、已有進度、作品篇幅或目標 Stress。
- UI target list 必須委派同一套 runtime validator；不能顯示「看似可選、實際 runtime 會拒絕」的目標。
- 完全沒有合法 target 或效果必然為 no-op 時，技能應在發動前不可用。
- `activeUsage.group` 可讓多個技能共享同一使用次數桶，例如阿道的加長／縮短全局合計兩次。

### Effect immunity vs untargetable

- **效果無效**：target 仍合法，技能／卡牌正常發動與消耗，但落在免疫目標上的 effect 不改變狀態。
- **不能指定**：target validation 階段就不是合法目標。

神惱「自己做」屬於效果無效；弱智的統籌卡指定限制屬於 untargetable。

### Custom handler contract

`status: implemented` 的 custom effect 必須在 live runtime registry 真正完成註冊。Registry 現在會：

- 可被 contract tests 查詢 handler 是否存在；
- 遇到同名 handler 重複註冊時 fail fast，不再靜默覆寫。

## Character-specific current notes

角色的完整數值與技能仍以 per-character package 為準。近期容易與舊文件混淆的規則：

- **Pintbox**：`審稿` 可主動重擲己方所有 1/2 pending dice；每重擲一顆，該骰 owner +1 Stress。`這只是基本的要求……` 在 Pintbox Stress >=3 且工作批次出現 1/2 時，自動處理該批與既有 pending 低骰直到沒有 1/2。
- **風揚**：`起來` 已實作；回合開始時若自身達有效 Stress 上限，會依技能規則處理自身／組長 Stress。
- **情緒**：`屬陀螺的` 以實際統籌卡 target 判斷；每回合第一次成為統籌卡目標時，己方組長 Stress -1。
- **流星**：`軌之共鳴` 只有自己的作品為（燃）且存在可重擲 pending die 時才可發動。
- **格林**：`對托內利可的愛` 只有自己的（情）作品存在已放置進度時可發動。
- **鬼影**：`貓影共鳴` 必須真的存在可重擲的 Design 進度，不能空付 Stress。
- **鴿子的化身／嘆息**：加骰值技能不會把已經沒有提升空間的 6 點骰當成合法 target。
- **Pray**：`高產` 不能對 1 點骰做 1→1 的 no-op 拆分。
- **TA**：`人氣作家的手腕` 是無指定目標的主動技能；有自身 pending dice 時，重擲最低的最多 2 顆。
- **三角希＆有希**：回復技能必須讓自身或所選三角生物至少一方真的有 Stress 可下降。
- **阿道**：`開個回憶篇` 會正確取得實際 slot index；自己的骰放到自己作品第 4/5 slot 時 +1 Stress。加長／縮短共用全局兩次 quota，作品已長度 1 時不能縮短。
- **Enki**：`副組長力` 使用 pre-resolution `coordination.stressBearer` 決定統籌卡 Stress bearer，不會因對手出牌觸發；`代組長力` 的 +2 會實際進入有效 Stress 上限計算。

## Standard roster completeness

旁白與銀櫻仍有 `planned` 技能，但**照常進入 Standard 自動抽選與 Online 一般候選池**。保留可選是刻意的測試策略：角色必須能進入真實對局流程，才能做手動、整合與回歸測試。

`planned` 只表示該技能目前沒有完整 runtime behavior，不等於角色不可出戰。若未來要改變 roster eligibility，必須把它視為獨立的遊戲規則／數據變更，並同步 tests 與文件。

## Scoring and game end

第 5 回合的 `roundEnd` 與 final triggers 完成後：

1. 每個作品 slot 取 Design / Text / AA 最低值；缺項為 -2。
2. 作品分數 = 所有 slot 分數總和。
3. 隊伍分數 = 該隊所有作品分數總和。
4. 高分者勝；同分為平手。

若較早發生「組長離場且無人可接任」的立即敗北，不再走一般分數比較。

## Source hierarchy

若文件之間內容不同：

1. `src/content/`、`src/game/`、`src/online/` 與對應 tests 描述目前程式真正怎麼跑。
2. `GAME_RULES.md` 是 runtime 規則摘要。
3. `GAME_MANUAL.md` 是玩家向說明。
4. `ONLINE_MULTIPLAYER.md` 是連線模式的網路與流程說明。
5. `PROJECT_STATUS.md` 記錄目前功能與 known gaps。
6. `discussion-notes.md` 保存來源討論與歷史脈絡，不代表目前 runtime snapshot。

遊戲規則或遊戲數據變更時，程式與上述對應文件必須在同一個 PR 中同步；詳細要求見 `AGENTS.md`。
## Responsive battle UI

Standard、Online、Tutorial 共用 BattleRoom 的響應式欄位與區域導覽。導覽只捲動頁面，技能說明展開只影響顯示；不改變 phase、合法目標、使用次數、事件、計分或角色／卡牌資料。目標選取提示與取消控制現在也顯示於一般對局，仍呼叫原有 cancelSelection。

## 2026-09-19 P0 discussion rules

- Live work types are now **燃 / 謀 / 笑 / 情 / 怪**; **色** is removed from the runtime vocabulary.
- A work has one primary type plus optional extra types. Affinity checks and work-type skill conditions match any current type. A replace-type effect clears extra types; an add-type effect preserves the primary type.
- Initial game construction supports an explicit legal work-type choice per character; choices must be within that character's effective affinity (including all-affinity passives). The player-facing selection UI is tracked separately from this engine contract.
- Dice rolls resolve against a shared forbidden-face set. If no legal face remains, that die disappears instead of retrying indefinitely.
- Coordination-card stress cost must have a legal bearer before the card can be used. Vice-leader bearers are chosen by remaining Stress headroom, not raw Stress.
- 指導 has coordination stress cost 0; it instead gives its target +1 Stress. A stat 0 target succeeds on 5–6, a stat 1 target succeeds on 6.
