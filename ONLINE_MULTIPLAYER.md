# Online Multiplayer

目前連線模式是 **WebRTC DataChannel P2P + 6 位數房間代碼 signaling**。遊戲不需要獨立 Backend、Cloudflare 或 AWS；GitHub Pages / Vite 只負責提供前端檔案。

## Architecture

- **Host authoritative**：Host 保存唯一 authoritative `GameState`、執行 `EngineSession`、處理 RNG 與規則驗證。
- **Guest command-only**：Guest 不自行結算遊戲規則，只傳送 play card / activate skill / place die / finish assignment 等 command。
- Host 每次接受 command 後傳回完整 state snapshot。
- Guest 收到 snapshot 後交換 `player` / `enemy` perspective，因此 Host 與 Guest 都能使用同一個 `BattleRoom` UI；各自畫面中的 `player` 永遠代表本地玩家。
- Standard AI mode 仍使用原本 `DrawPhaseScreen` 的隨機隊伍 / 單次重抽，以及 `finishPlayerAssignment() -> runEnemyTurn()` 流程。
- Online mode 不使用 AI 的重抽流程；連線後先進入雙方共用的 character draft，再開始 human-vs-human battle。

## Player-facing copy policy

連線實作細節只屬於開發文件與程式碼，不應直接顯示給玩家。UI、提示與可見錯誤訊息應使用「房間、房間代碼、對手、連線、重新嘗試」等玩家語言。

以下術語不得作為玩家 UI 說明：`WebRTC`、`P2P`、`signaling`、`SDP`、`ICE`、`STUN`、`TURN`、`MQTT`、`broker`、`DataChannel`。角色選擇畫面同樣避免 `Draft` / `Pick` 等內部命名，統一使用「選擇角色／已選」。

## Signaling / room code

6 位數房間代碼只是短期 **room locator**，不是把 WebRTC Offer 壓縮成 6 位數。

瀏覽器使用 EMQX public MQTT broker 的 secure WebSocket endpoint `wss://broker.emqx.io:8084/mqtt` 作為 rendezvous channel：

1. Host 先選擇 3 人或 5 人模式，再產生隨機 6 位數 room code。
2. Guest 輸入同一個 room code 並送出 join message。
3. Host / Guest 透過該 topic 自動交換 WebRTC SDP 與 ICE candidate。
4. WebRTC DataChannel 開啟後立即關閉 MQTT signaling connection。
5. 後續 draft、遊戲 command / snapshot 只走 WebRTC P2P，不經 MQTT broker。

Repository 內的 `src/online/mqttSignaling.ts` 是最小 MQTT 3.1.1 over WebSocket client，只實作此流程需要的 CONNECT / SUBSCRIBE / QoS 0 PUBLISH / PING / DISCONNECT，因此不需要額外 npm dependency。

> EMQX public broker 是公開的 prototype / testing service。Signaling topic 上的資料不應包含帳號、密碼或其他敏感資訊。本遊戲只用它交換短期 WebRTC negotiation data。

## Online character draft

房主在**建立房間前**先決定隊伍人數：

- 3 人模式：隨機公開 6 張不同角色卡。
- 5 人模式：隨機公開 10 張不同角色卡。

連線成功後，Host 產生候選 pool，並以 Host-authoritative draft state 同步給 Guest。雙方只能在輪到自己時選未被選走的角色。

Pick 批次順序：

- 3 人：`Host 1 -> Guest 2 -> Host 2 -> Guest 1`
- 5 人：`Host 1 -> Guest 2 -> Host 2 -> Guest 2 -> Host 2 -> Guest 1`

也就是一般化的 `1-2-2-...-2-1`，最後雙方都會得到相同數量的角色。每一方**第一張 Pick 的角色就是該隊組長**，因此 Online 不再存在只有 Host 能重抽或只有 Host 能選組長的不對稱。

所有角色選完後，Host 才建立正式 `GameState`；Guest 收到第一個 gameplay snapshot 後，雙方進入同一個 `BattleRoom`。

## Connection flow

1. 兩邊開啟相同版本的遊戲。
2. Host 點「連線對戰」→「建立連線房間」。
3. Host **先選 3 人或 5 人模式**。
4. 畫面才顯示 6 位數房間代碼，例如 `381204`。
5. Host 把這 6 位數傳給 Guest。
6. Guest 點「連線對戰」→「加入連線房間」，輸入 6 位數代碼。
7. 瀏覽器自動完成 SDP / ICE signaling。
8. 連線成功後雙方直接進入 character draft，依 `1-2-2-...-2-1` 輪流 Pick。
9. Draft 完成後自動建立對局並進入 `BattleRoom`；不再經過 Online 單方重抽畫面。

## Local development test

```bash
npm install
npm run dev
```

推薦：

- Chrome：Host
- Edge 或 Chrome Incognito：Guest
- 兩邊都開 Vite 顯示的 `http://localhost:5173/...`
- Host 選模式後建立房間，把 6 位數代碼輸入 Guest
- 先完整測完一輪 draft，再確認雙方自動進入 BattleRoom

需要再驗證真實 NAT traversal 時，可使用 PC Wi-Fi + 手機 5G，或不同網路的兩台裝置。

## Network limitation

目前只設定公共 **STUN**，沒有 TURN relay。一般可 P2P 的 NAT 環境可直接連線；嚴格公司網路、部分 CGNAT / symmetric NAT 可能無法建立連線。MQTT signaling 能讓兩邊找到彼此，但無法取代 TURN relay。

這是刻意的 Prototype 限制，以維持「不需要自架 Server / Cloudflare / AWS」。

## Room-code limitation

6 位純數字只有 1,000,000 種組合，因此：

- 適合朋友間短期配對，不應視為安全密碼。
- 配對期間 Host 只接受第一位 Guest；若同時出現另一位 Guest，Host 會回覆 room busy。
- DataChannel 建立後雙方會離開 MQTT signaling topic，因此該 6 位數不再接受新的 peer；Host 關閉頁面後也沒有任何 server-side room state 可恢復。
- 若未來需要公開 matchmaking、防猜房、可靠 reconnect 或大量同時房間，應改用具有 server-side room registry 的正式 signaling service，或提高 room code entropy。

## Security / competitive limitation

此版本適合朋友間對戰，不是 anti-cheat 架構：Host 擁有 authoritative state，Guest 也會收到可供 UI 使用的完整 snapshot。若未來需要公開競技、隱藏資訊防窺或可靠 reconnect，應改成可信 Server authority 或加入 state redaction / reconnect protocol。

## Regression requirements

修改 Online turn / Engine interaction時，至少執行：

```bash
npm run typecheck
npm run test
npm run build
```

並人工確認：

- Standard AI 對戰仍保留原本單次重抽、選組長與 AI 自動回合。
- Tutorial 固定流程仍可完成。
- Host 必須先選 3 / 5 人模式，之後才能產生 room code。
- 3 人 draft 是 6 張候選、`1-2-2-1`；5 人 draft 是 10 張候選、`1-2-2-2-2-1`。
- 非自己回合、超過該批選牌數或已被 Pick 的角色不可再選。
- 雙方第一張 Pick 正確成為各自隊伍組長。
- Draft 完成前不建立正式 gameplay state；完成後雙方自動進 BattleRoom。
- Host / Guest 都能進行創作、放骰、出牌、發動技能、手牌超限棄牌與結束回合。
- Guest 回合結束後會正確進入下一回合 Host turn。
- 6 位數 code 可在 Chrome Host + Edge Guest 完成配對，不需人工交換 SDP。
- 玩家可見 UI 與錯誤訊息不顯示 WebRTC / P2P / signaling / SDP / ICE / STUN / TURN / MQTT / broker / DataChannel 等實作術語。
- 斷線後雙方不再允許繼續修改各自 state。
