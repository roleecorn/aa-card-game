# Online Multiplayer

目前連線模式是 **WebRTC DataChannel P2P + manual signaling**。遊戲不需要獨立 Backend、Cloudflare 或 AWS；GitHub Pages / Vite 只負責提供前端檔案。

## Architecture

- **Host authoritative**：Host 保存唯一 authoritative `GameState`、執行 `EngineSession`、處理 RNG 與規則驗證。
- **Guest command-only**：Guest 不自行結算遊戲規則，只傳送 play card / activate skill / place die / finish assignment 等 command。
- Host 每次接受 command 後傳回完整 state snapshot。
- Guest 收到 snapshot 後交換 `player` / `enemy` perspective，因此 Host 與 Guest 都能使用同一個 `BattleRoom` UI；各自畫面中的 `player` 永遠代表本地玩家。
- Standard AI mode 仍使用原本 `finishPlayerAssignment() -> runEnemyTurn()` 流程；Online mode 使用獨立的 human turn adapter。

## Connection flow

1. 兩邊開啟相同版本的遊戲。
2. Host 點「連線對戰」→「我是 Host」並建立 Offer Code。
3. Host 透過 Discord / LINE / 其他聊天工具將 Offer Code 傳給 Guest。
4. Guest 點「連線對戰」→「我是 Guest」，貼上 Offer Code，產生 Answer Code。
5. Guest 將 Answer Code 傳回 Host。
6. Host 貼上 Answer Code，DataChannel 顯示已連線。
7. Host 使用原本的「開始遊戲」流程選擇 3 / 5 人與隊伍；Guest 收到初始 snapshot 後直接進入相同的遊玩 UI。

## Local development test

```bash
npm install
npm run dev
```

推薦：

- Chrome：Host
- Edge 或 Chrome Incognito：Guest
- 兩邊都開 Vite 顯示的 `http://localhost:5173/...`
- 手動交換 Offer / Answer Code

需要再驗證真實 NAT traversal 時，可使用 PC Wi-Fi + 手機 5G，或不同網路的兩台裝置。

## Network limitation

目前只設定公共 **STUN**，沒有 TURN relay。一般可 P2P 的 NAT 環境可直接連線；嚴格公司網路、部分 CGNAT / symmetric NAT 可能無法建立連線。這是刻意的 Prototype 限制，以維持「不需要自架 Server / Cloudflare / AWS」。

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
- 斷線後雙方不再允許繼續修改各自 state。
