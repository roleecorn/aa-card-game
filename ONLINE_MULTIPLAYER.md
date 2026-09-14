# Online Multiplayer

目前連線模式是 **WebRTC DataChannel P2P + 6 位數房間代碼 signaling**。遊戲不需要獨立 Backend、Cloudflare 或 AWS；GitHub Pages / Vite 只負責提供前端檔案。

## Architecture

- **Host authoritative**：Host 保存唯一 authoritative `GameState`、執行 `EngineSession`、處理 RNG 與規則驗證。
- **Guest command-only**：Guest 不自行結算遊戲規則，只傳送 play card / activate skill / place die / finish assignment 等 command。
- Host 每次接受 command 後傳回完整 state snapshot。
- Guest 收到 snapshot 後交換 `player` / `enemy` perspective，因此 Host 與 Guest 都能使用同一個 `BattleRoom` UI；各自畫面中的 `player` 永遠代表本地玩家。
- Standard AI mode 仍使用原本 `finishPlayerAssignment() -> runEnemyTurn()` 流程；Online mode 使用獨立的 human turn adapter。

## Signaling / room code

6 位數房間代碼只是短期 **room locator**，不是把 WebRTC Offer 壓縮成 6 位數。

瀏覽器使用 EMQX public MQTT broker 的 secure WebSocket endpoint `wss://broker.emqx.io:8084/mqtt` 作為 rendezvous channel：

1. Host 產生隨機 6 位數 room code，訂閱該房間的 signaling topic。
2. Guest 輸入同一個 room code 並送出 join message。
3. Host / Guest 透過該 topic 自動交換 WebRTC SDP 與 ICE candidate。
4. WebRTC DataChannel 開啟後立即關閉 MQTT signaling connection。
5. 後續遊戲 command / snapshot 只走 WebRTC P2P，不經 MQTT broker。

Repository 內的 `src/online/mqttSignaling.ts` 是最小 MQTT 3.1.1 over WebSocket client，只實作此流程需要的 CONNECT / SUBSCRIBE / QoS 0 PUBLISH / PING / DISCONNECT，因此不需要額外 npm dependency。

> EMQX public broker 是公開的 prototype / testing service。Signaling topic 上的資料不應包含帳號、密碼或其他敏感資訊。本遊戲只用它交換短期 WebRTC negotiation data。

## Connection flow

1. 兩邊開啟相同版本的遊戲。
2. Host 點「連線對戰」→「建立連線房間」。
3. 畫面顯示 6 位數房間代碼，例如 `381204`。
4. Host 透過 Discord / LINE / 其他聊天工具把這 6 位數傳給 Guest。
5. Guest 點「連線對戰」→「加入連線房間」，輸入 6 位數代碼。
6. 瀏覽器自動完成 SDP / ICE signaling；不再需要人工交換 Offer / Answer。
7. DataChannel 顯示已連線後，Host 使用原本的「開始遊戲」流程選擇 3 / 5 人與隊伍；Guest 收到初始 snapshot 後直接進入相同的遊玩 UI。

## Local development test

```bash
npm install
npm run dev
```

推薦：

- Chrome：Host
- Edge 或 Chrome Incognito：Guest
- 兩邊都開 Vite 顯示的 `http://localhost:5173/...`
- Host 建立房間，把 6 位數代碼輸入 Guest

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

- Standard AI 對戰仍會在玩家結束分配後自動完成 AI turn。
- Tutorial 固定流程仍可完成。
- Host / Guest 都能進行創作、放骰、出牌、發動技能、手牌超限棄牌與結束回合。
- Guest 回合結束後會正確進入下一回合 Host turn。
- 6 位數 code 可在 Chrome Host + Edge Guest 完成配對，不需人工交換 SDP。
- 斷線後雙方不再允許繼續修改各自 state。
