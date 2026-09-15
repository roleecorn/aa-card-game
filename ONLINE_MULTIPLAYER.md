# Online Multiplayer

目前連線模式是 **WebRTC DataChannel P2P + 6 位數房間代碼 signaling**。遊戲不需要獨立 Backend、Cloudflare 或 AWS；GitHub Pages / Vite 只負責提供前端檔案。

本文件同時記錄玩家流程、authoritative state model 與目前 Prototype 限制。玩家向完整規則仍以 `GAME_MANUAL.md` 為準。

## Architecture

- **Shared BattleRoom**：Standard AI 與 Online 共用 `src/app/BattleRoom.tsx`；Online 不維護第二套戰鬥 UI。
- **Host authoritative**：Host 保存唯一 authoritative `GameState`、執行 `EngineSession`、處理 RNG 與規則驗證。
- **Guest command-only**：Guest 不自行結算規則，只傳送 play card / activate skill / place die / finish assignment 等 command。
- Host 接受 command 後傳回完整 state snapshot。
- Guest 收到 snapshot 後交換 `player` / `enemy` perspective，因此雙方畫面中的 `player` 都代表本地玩家；隊伍名稱也必須跟著 perspective 一起交換。
- 隊伍名稱保存在 `TeamState.name`，BattleRoom / scoreboard 直接讀取該 authoritative display identity，不另外維護 UI 暫用名稱。
- Standard AI 仍使用自己的抽隊／一次重抽／選組長與 AI turn handoff；Online 不經這套 setup。

```text
Host UI command
  -> Host EngineSession
  -> authoritative GameState
  -> snapshot -> Guest

Guest UI command
  -> DataChannel command
  -> Host validation / EngineSession
  -> authoritative GameState
  -> snapshot -> Guest
```

## Player-facing copy policy

網路實作細節只屬於開發文件與程式碼。玩家 UI、提示與錯誤訊息應使用「房間、房間代碼、對手、連線、重新嘗試、角色選擇」等語言。

以下術語不得作為一般玩家 UI 說明：`WebRTC`、`P2P`、`signaling`、`SDP`、`ICE`、`STUN`、`TURN`、`MQTT`、`broker`、`DataChannel`。角色選擇畫面也避免 `Draft` / `Pick` 等內部命名。

## Signaling / room code

6 位數房間代碼只是短期 **room locator**，不是把 WebRTC Offer 壓縮成 6 位數。

瀏覽器使用 EMQX public MQTT broker 的 secure WebSocket endpoint `wss://broker.emqx.io:8084/mqtt` 作為 rendezvous channel：

1. Host 先選擇 3 人或 5 人模式，再產生隨機 6 位數 room code。
2. Guest 輸入同一 room code 並送出 join message。
3. Host / Guest 透過該 topic 自動交換 WebRTC SDP 與 ICE candidate。
4. WebRTC DataChannel 開啟後立即關閉 MQTT signaling connection。
5. 後續角色選擇、隊伍 display identity、遊戲 command / snapshot 只走 WebRTC P2P，不經 MQTT broker。

`src/online/mqttSignaling.ts` 是最小 MQTT 3.1.1 over WebSocket client，只實作此流程需要的 CONNECT / SUBSCRIBE / QoS 0 PUBLISH / PING / DISCONNECT，因此不需要額外 npm dependency。

> EMQX public broker 是公開的 prototype / testing service。Signaling topic 上的資料不應包含帳號、密碼、隊伍名稱或其他非 negotiation 必要資訊。本遊戲只用它交換短期 negotiation data。

## Team identity / saved name

Standard AI 與 Online 都會在正式開始前要求玩家輸入自己的**隊伍名稱**：

- 預設值是 `AA同好會`。
- 成功開始 Standard 對局、建立 Online 房間或加入 Online 房間時，名稱會寫入瀏覽器 Cookie。
- Cookie key 為 `aa_card_game_team_name`，`Path=/`、`SameSite=Lax`，保存 1 年；HTTPS 環境另外加 `Secure`。
- 下次開啟遊戲時會自動帶入上一次保存的名稱，玩家仍可修改。
- 隊伍名稱最多 24 個 Unicode code points，空白名稱不能開始／加入對局。

Online identity 的 authoritative flow：

1. Host / Guest 在自己的瀏覽器先確認本地隊伍名稱。
2. Host 名稱只保存在本地 session；不放進公開 MQTT signaling topic。
3. Guest 的合法角色選擇訊息會透過已建立的 WebRTC DataChannel 帶上 `teamName`；Host 收到後保存為 `remoteTeamName`。這個欄位維持 backward-compatible optional，舊 client 未提供時回退到 `AA同好會`。
4. 正式建局時，Host 把 `localTeamName` 寫入 `GameDefinition.rules.player.name`，把 `remoteTeamName` 寫入 `GameDefinition.rules.enemy.name`，因此 `createInitialGame()` 產生的 `TeamState.name` 從第一個 snapshot 起就是正確名稱。
5. Guest 收到 snapshot 後，`swapGamePerspective()` 交換 roster / phase 的同時也交換 team names，確保 Guest 畫面中的本地 `player.name` 是 Guest 自己的名稱。

隊伍名稱只是**玩家可見 display identity**，用來判斷目前和誰對戰；它不是帳號、簽章或 authentication，不能阻止猜到房號的陌生人搶先加入。

## Leaving online setup

Online setup dialog 的生命週期等同這一次連線流程：

- 使用「關閉」、Dialog backdrop / Escape 等方式離開 setup 時會呼叫 `disconnect()`。
- Guest 輸入的 room code 與 Host mode-selection UI state 一併清除。
- 不支援「把 Dialog 關掉但連線在背景繼續」的狀態。
- 重新進入連線對戰後需重新建立／加入房間。
- 本地已保存的隊伍名稱 Cookie 不會因 disconnect 清除。

這條規則是刻意的 lifecycle boundary，避免 UI 已離開但 signaling / peer connection 仍殘留。

## Online playable roster

Online 候選池由 `App.tsx` 使用目前 `GameDefinition.roster.excludedCharacterIds` 過濾，所以與 Standard playable pool 共用 eligibility。

目前 catalog 39 名角色，一般 Online / Standard 只排除：

- `chaos`

因此目前候選來源為 **38 名角色**。`narrator` 與 `ginsakura` 雖仍有 `planned` 技能，但照常保留在候選來源，方便在真實連線／對局流程中做實機與整合測試。`planned` skill status 本身不構成 roster exclusion。

Explicit test/custom scenario roster override 仍可用於 deterministic scenario，但不代表玩家 UI 可以繞過真正的 roster exclusions。

## Online character selection

Host 在**建立房間前**先決定隊伍人數：

- 3 人模式：隨機公開 6 張不同角色卡。
- 5 人模式：隨機公開 10 張不同角色卡。

連線成功後，Host 產生候選 pool，並以 Host-authoritative selection state 同步給 Guest。雙方只能在輪到自己時選尚未被選走的角色。

選擇批次：

- 3 人：`Host 1 -> Guest 2 -> Host 2 -> Guest 1`
- 5 人：`Host 1 -> Guest 2 -> Host 2 -> Guest 2 -> Host 2 -> Guest 1`

也就是 `1-2-2-...-2-1`；最後雙方各自得到 `teamSize` 名角色。

每一方**第一個選到的角色就是該隊初始組長**。Online 沒有 Standard 的單次重抽，也沒有選完隊伍後再單獨選組長的步驟。

### Selection UI lifecycle

Online selection 使用與 Standard「你的初始隊伍」一致的角色資訊層級：portrait、stats、affinities、tags、skill names / descriptions。

目前互動流程：

1. 候選角色先以卡背進場，逐張翻開。
2. 翻牌未結束前不能選角；可按「跳過抽卡動畫」。
3. 玩家選中合法角色後，source card 暫時留在原位置。
4. 浮動卡片從中央候選區移動到 Host / Guest 對應 team rail。
5. 落點完成後，team rail 顯示角色並短暫 highlight。
6. 此時中央 source slot 才真正移除，剩餘候選 reflow。
7. 動畫期間暫停下一次選取，避免快速點擊跳過 transfer。
8. Team rails 保留 wheel / touch scrolling，但 scrollbar 永遠不顯示。
9. `prefers-reduced-motion` 可跳過飛行動畫，但仍必須進入相同 final state。

### Final-pick transition gate

最後一名角色被選出後，**不能立刻切進 BattleRoom**。

- Host 必須等待自己的最後一次 transfer / landing animation settle，才建立並 broadcast 正式 GameState。
- Guest 收到 gameplay state 後，如果本地最後一次 selection animation 尚未 settle，仍停留在角色選擇畫面。
- 兩邊都只在本地視覺狀態完成後進入 `BattleRoom`。

這避免最後一張卡只飛到一半就被畫面切換中斷。

## Formal game creation

全部角色選完且 Host 視覺流程 settled 後：

1. Host 以 draft `teamSize` 建立該局 `GameDefinition`，並把 Host / Guest 隊伍名稱寫進 `rules.player.name` / `rules.enemy.name`。
2. `hostPicks` 成為 Host roster；`guestPicks` 成為 Guest roster。
3. Host 第一個 pick 作為初始 Host leader；Guest 第一個 pick 在 Guest perspective 下作為初始 Guest leader。
4. Host 建立正式 `GameState` 並 broadcast snapshot；其中兩個 `TeamState.name` 已是玩家輸入的名稱。
5. Guest perspective swap 同時交換 team names。
6. 雙方進入共用 `BattleRoom`；scoreboard 與左右 team column 都直接顯示 `TeamState.name`。

角色技能、卡牌、Stress、作品、targeting 與 scoring 不因 Online 而 fork；Online 只改變 setup、turn ownership、display identity 與 network authority。

## Human turn flow

Online 使用 `src/game/onlineTurn.ts`：

```text
Host:  player-plan -> player-assign
Guest: enemy-plan  -> enemy-assign
       -> roundEnd / cleanup / draw / roundStart
       -> next Host player-plan
```

- `performOnlineTeamActions()` 只允許目前 phase 對應的 team 行動。
- 每一方結束 assignment 時，未使用 pending dice 清除。
- Host assignment 完成後，不會跑 Standard AI；而是切到 Guest plan。
- Guest assignment 完成後才執行共用 `advanceRound()`。
- Standard Engine 對 `enemy` 有自動丟棄超量手牌的 AI 假設；Online round transition 暫時替換 draw/add-card behavior，避免把真人 Guest 的超量手牌自動丟掉。
- 因此兩名 Online 玩家都要自行處理手牌上限。

## Connection flow

1. 兩邊開啟相同版本遊戲；隊伍名稱欄會預填上一次 Cookie 保存的名稱，第一次使用時為 `AA同好會`。
2. Host：「連線對戰」→輸入／確認自己的隊伍名稱→「建立連線房間」。
3. Host 先選 3 人或 5 人模式。
4. 顯示 6 位數房間代碼。
5. Guest：「連線對戰」→輸入／確認自己的隊伍名稱→「加入連線房間」，輸入代碼。
6. 瀏覽器自動完成配對與連線。
7. 雙方進入角色選擇，依 `1-2-2-...-2-1` 選角；Guest 第一次合法選角後 Host 已取得 Guest display identity。
8. 最後一次選角動畫完成後，自動進入 BattleRoom。
9. BattleRoom scoreboard / team columns 顯示雙方實際隊伍名稱，不再顯示暫用的「我方／對手創作小隊」名稱。

## Local development test

```bash
npm install
npm run dev
```

推薦：

- Chrome：Host
- Edge 或 Chrome Incognito：Guest
- 兩邊都開 Vite 顯示的本機 URL
- 兩邊輸入不同隊伍名稱，確認重新整理後 Cookie 能各自帶回上次名稱
- Host 選模式後建立房間，把 6 位數代碼輸入 Guest
- 完整測一輪角色選擇，再確認雙方進入 BattleRoom
- 確認 Host / Guest 各自看到自己的名稱在 `player` 側、對方名稱在 `enemy` 側，且 scoreboard 名稱一致

若要驗證真實 NAT traversal，可使用 PC Wi-Fi + 手機 5G，或不同網路的兩台裝置。

## Network limitation

目前只設定公共 **STUN**，沒有 TURN relay。一般可 P2P 的 NAT 環境可直接連線；嚴格公司網路、部分 CGNAT / symmetric NAT 可能失敗。MQTT signaling 只能協助找到彼此，不能替代 TURN relay。

這是刻意的 Prototype 限制，以維持「不需要自架 Server / Cloudflare / AWS」。

## Room-code limitation

6 位純數字只有 1,000,000 種組合：

- 適合朋友間短期配對，不是安全密碼。
- 隊伍名稱只提供 display identity；即使名稱看起來正確，也不構成身份驗證或防冒名機制。
- 配對期間 Host 只接受第一位 Guest；第二位會收到 room busy。陌生人若先猜中代碼，仍可能搶先占用該房間。
- DataChannel 建立後離開 signaling topic，該 code 不再作為持久 room registry。
- Host 關閉頁面後沒有 server-side room state 可恢復。
- 未來若要 public matchmaking、防猜房、可靠 reconnect 或大量房間，需要正式 signaling / room registry 或更高 entropy 的 code。

## Security / competitive limitation

此版本適合朋友間對戰，不是 anti-cheat 架構：Host 擁有 authoritative state，Guest 也會收到供 UI 使用的完整 snapshot。

目前也沒有 reliable reconnect / state-resume protocol。斷線後不應允許雙方繼續各自修改分歧 state；要重新建立對局。

若未來需要公開競技、隱藏資訊防窺或可靠 reconnect，應改成可信 Server authority 或加入 state redaction / reconnect protocol。

## Regression requirements

修改 Online setup / selection / turn / Engine interaction 時，至少執行：

```bash
npm run typecheck
npm run test
npm run build
npm run test:tutorial
```

並同步更新本文件；若變更也改變一般遊戲規則，需同步 `GAME_RULES.md` / `GAME_MANUAL.md` / `PROJECT_STATUS.md` 等對應文件。

人工確認至少包括：

- Standard AI 仍保留一次重抽、選組長與 AI 自動回合。
- Tutorial 固定流程仍可完成。
- Standard / Online 都必須有非空白隊伍名稱；第一次預設 `AA同好會`，成功開始後 Cookie 可帶回上次名稱。
- Host 必須先選 3 / 5 人模式才能產生 room code。
- 關閉 Online setup 會 disconnect，不留下背景連線；隊伍名稱 Cookie 保留。
- 隊伍名稱不出現在 MQTT signaling payload；Guest identity 只在 WebRTC DataChannel 的選角訊息中傳送。
- 3 人 selection 是 6 候選、`1-2-2-1`；5 人是 10 候選、`1-2-2-2-2-1`。
- 候選 pool 不包含 Standard excluded characters；目前只排除 `chaos`，旁白與銀櫻應能出現在候選來源中。
- 非自己回合、超過該批選牌數、已選角色不能再次選。
- 選中角色從中央飛到正確 team rail，完成後才從 pool 移除。
- Team rails 不顯示 scrollbar。
- 最後一次 selection 動畫完整完成後才進 BattleRoom。
- 雙方第一個 pick 正確成為各自初始組長。
- Host / Guest 的 `TeamState.name` 都正確，Guest perspective swap 後不會把 Host / Guest 名稱放反。
- BattleRoom scoreboard 與左右 team column 顯示實際隊伍名稱。
- Host / Guest 都能 Work / Slack、放骰、出牌、發動技能、處理超量手牌與結束回合。
- Guest 回合結束後正確進下一回合 Host turn。
- 6 位數 code 可在兩個瀏覽器 session 完成配對，不需人工交換 SDP。
- 玩家可見 copy 不洩漏 WebRTC / P2P / signaling / SDP / ICE / STUN / TURN / MQTT / broker / DataChannel 等實作術語。
- 斷線後雙方不再允許繼續修改各自 state。
