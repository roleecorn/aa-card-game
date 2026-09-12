# 技能與卡牌動態提示調整紀錄

日期：2026-09-12  
分支：`feat/gameplay-action-feedback`

## 本次體驗調整

- 新增「戰況提示」：施放者頭像、我方／對手、技能／卡牌名稱、回合及實際效果一起呈現。
- 施放橫幅以 280ms 滑入；每組最多三項效果停留 3.6 秒，連鎖事件依發動順序播放。
- 角色、骰子、作品與手牌區依效果標亮；骰子已消失或對手作品未呈現時，改標亮負責角色。
- 綠色「＋ 增益」、紅色「− 減益」、藍色「↔ 變化」同時使用文字與符號。正負以受影響方為準；對手獲益也顯示增益。
- 顯示實際結算前後數字，例如格林發動燃燒畫面：壓力 1 → 2 是減益，AA 骰 3 → 5 是增益。作品效果包含作品名稱、第幾格及 DESIGN／TEXT／AA。
- 出牌造成的單張手牌消耗獨立標成一般變化；未知資源、作品類型／篇幅等不武斷判為增益或減益。
- 捲動到下方操作區時，右下角出現不攔截點擊的浮動提示，保留施放者和本組效果。
- 支援暫停提示、略過動畫與最近 100 次效果回看。全部自動播放，沒有新增必須點擊的確認步驟。
- 遵循系統 `prefers-reduced-motion`：移除滑入、亮度變化和進度動畫，保留靜態標亮及文字。
- 相同結果的重複自動被動保持安靜；明確指定的目標沒有變化時顯示「無可見數值變化」，不宣稱已造成增減益。
- 卡文首次施放顯示減益狀態，之後低骰觸發時再次提示，保留原始施放者；部分失敗但已發生的變化標示「未完整結算」。
- 移除重複的成功 Snackbar，失敗原因仍沿用原有提示。

## 架構與規則邊界

`src/game/actionFeedback.ts` 提供獨立的觀察器。技能效果與卡牌處理前後取值，產生結構化 presentation history；不解析紀錄文字，也不從角色 ID 分支判定技能。

巢狀觸發前先記錄外層已完成的變化，內層結束後重設外層觀察基準，避免把被動技能的效果重複歸給原始卡牌。序號不使用 RNG；讀取能力使用既有的純 getter，不額外執行 condition 或 effect handler。

`GameState.feedback`、`feedbackSequence` 是可選的呈現資料；`StatusInstance.feedbackSource` 僅保存延遲提示的來源。遊戲規則、目標合法性、消耗、AI、抽牌、回合與勝負流程不依賴這些欄位。舊狀態缺少欄位時仍可執行；舊狀態的卡文若沒有來源資訊，沿用原結算及紀錄。

React 的播放佇列與引擎完全分離。動畫播放的是已結算的歷史，遊戲可以繼續操作；提示帶有回合標示，回看保留完整結果。重開會卸載呈現元件並清除當局佇列。教學初始化會清除被固定手牌配置替換掉的開場提示。

角色頭像直接使用既有 content 的 compactPortrait／portrait，透過 `resolvePublicAssetPath` 套用 Vite base；沒有新增、替換或提交圖片 binary，也沒有新增 dependency。

## 驗證

- 新增 8 個觀察器 regression tests：技能代價與增益、非法發動、自動無變化、指定目標無變化、巢狀歸因、延遲卡牌來源、失敗後清理、有限歷史，以及有／無觀察器的完整回合狀態與 RNG 對照（部分情境合併在同一 test）。
- 教學 deterministic tests 納入完整測試。
- 瀏覽器實際完成教學：摸魚／創作切換 → 擲骰 → 格林技能及目標 → 骰子分配 → 指導及目標 → 真白複製骰及雙目標 → 三角希跨隊伍目標 → 結束回合 → 教學完成。
- 390 × 844 窄螢幕實測至格林技能：頭像、文字換行、兩種效果、目標骰標亮與浮動提示均有畫面確認；浮動提示實測 left=12、right=363、width=351，`pointer-events: none`。
- public asset resolver 既有 regression 涵蓋 `/aa-card-game/` 下的 portrait 與 compact 圖片。
- 最終 typecheck、test、build 結果記於下方，未執行的環境組合不視為通過。

## Figma 對照

- [FeedbackImpact 三種效果列](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=9-256)
- [ActionFeedback 提示元件](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=10-250)
- [360px 窄版元件](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=10-260)
- [主畫面內的提示位置](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=10-270)

已新增提示用色彩／間距／圓角共 12 個變數與字體樣式，確認使用 Noto Sans TC，並檢查效果列及整合面板截圖。未上傳 runtime raster。

最後的施放者頭像槽同步被 Figma Starter MCP 額度限制擋下，尚未寫入；程式已有頭像。Figma 保存的是布局與效果樣式，並非可執行的 3.6 秒播放佇列；播放行為以 React 實作為準。原 Figma 畫面的既有 roster 示意未在本次重新校準。

## 已知取捨

- 這版採短橫幅、角色頭像、目標外框及數值變化；沒有新增全螢幕演出、音效或阻擋操作的戰鬥播放流程。
- 大量連鎖的提示會排隊，玩家可略過動畫並回看；畫面上的實際遊戲狀態可能已比正在播放的提示更新。
- 新增特殊狀態時若沒有已知正負語意，先顯示一般變化。可在觀察器補狀態呈現標籤，不需要修改技能規則。
- 尚未自動化瀏覽器的動態時間／螢幕閱讀器／系統減少動態設定；本次使用實際瀏覽器確認一般動態與互動，並以 source 實作支援 reduced motion。

## 最終檢查結果

- `npm run typecheck`：通過。
- `npm run test`：31 個 test files、164 個 tests 通過（包含教學與 non-root asset regression）。
- `npm run build -- --base=/aa-card-game/`：通過；輸出的 HTML 使用 `/aa-card-game/assets/...`。
- `git diff --check`：通過。
- 最終手機瀏覽器驗證沒有 console error。
- Build 有 Zod 註解移除與單一 bundle 大於 500kB 的警告，未造成 build 失敗；本次未調整套件或拆分 bundle。
