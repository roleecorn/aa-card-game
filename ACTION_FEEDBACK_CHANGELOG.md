# 技能與卡牌動態提示調整紀錄

日期：2026-09-12

分支：`feat/gameplay-action-feedback`

## 需求修正：目標互動模型

本節是此功能後續實作的需求來源。下方「目前 branch 實作」僅記錄現況，不代表最終 UX 已符合需求。

這個功能不是一般 notification、combat log 或固定區域的 action feedback panel。目標是接近《碧藍航線》技能發動時的 **full-screen cut-in / combat presentation**：技能或卡牌發動後，當下的視覺注意力暫時交給動畫；一般遊戲操作暫停，但玩家可以透過滑鼠點擊或 touch 立即跳過當前動畫。

### 必要行為

- 技能、卡牌或需要強調的連鎖效果發動時，必須使用覆蓋整個 viewport 的 **full-screen presentation overlay**。
- Overlay 是疊在既有遊戲畫面上的演出層，不得在正常 document flow 中保留一塊固定「動畫區域」，也不得只是把現有提示 panel 放大成 Dialog。
- 動畫播放期間，下層遊戲 UI 不得直接接收操作。滑鼠點擊或 touch 應由 full-screen overlay 捕捉，並解讀為 **跳過當前動畫**，而不是穿透到下層控制項。
- 鍵盤以及其他可觸發遊戲行為的輸入，在動畫播放期間仍不可穿透到下層 UI；除非未來另行定義明確的 skip shortcut。
- 當前 presentation sequence 自然播放完成，或玩家點擊／touch 跳過後，才解除該段 presentation 的 input lock；若 queue 中仍有後續連鎖演出，依序進入下一段。
- 背景可以保留當前遊戲畫面，並依演出需要套用 dim、blur、flash、shake、vignette 等全畫面效果；角色立繪、技能名稱、卡牌名稱、特效等可跨越 viewport 排版。
- 受影響的角色、骰子、作品或其他物件，可以在原本遊戲畫面中的位置繼續做 highlight / shake / number change 等效果；不要求把所有資訊都塞進中央動畫卡片。
- 多個連鎖事件需要按照實際觸發順序進入 presentation queue；上一段演出未完成或未被跳過前，不得恢復一般玩家操作。
- `prefers-reduced-motion` 仍需支援，但 reduced motion 只降低位移、閃爍、縮放等動態，不得因此讓演出退化成可操作的背景 notification；點擊／touch 跳過規則保持一致。

### Presentation 與 Game Logic 的邊界

不要求把整個 `GameEngine` 改造成由動畫驅動的 async state machine。

允許 Game Logic 同步完成規則結算，再把已結算結果交給 Presentation Queue；但是 **玩家輸入必須被 presentation gate 接管，直到該段演出播放完畢或被玩家主動跳過**。

預期資料流：

```text
Player Action
    ↓
Game Engine / Rule Resolution
    ↓
Structured Presentation Event
    ↓
Presentation Queue
    ├─ full-screen cut-in
    ├─ actor / card / skill presentation
    ├─ target highlight / impact
    ├─ before → after number change
    └─ chained / delayed presentation
    ↓
Complete or Click / Touch to Skip Current Presentation
    ↓
Next Presentation or Unlock Player Input
```

因此：

- Game rule、合法目標、成本、AI、抽牌、回合與勝負邏輯仍不得依賴動畫元件本身。
- Presentation 可以消費已結算的 structured event，但不能只是「播放歷史紀錄且完全不影響互動 gate」。
- `FeedbackRecorder` 類型的資料蒐集機制可以保留，只要它仍能正確產生 actor、source、target、before / after、tone、nested attribution 等 presentation 所需資料。
- React presentation layer 必須另外有明確的 `isPresenting` / input-lock 概念；不能再把動畫時鐘設計成與 interaction gate 完全獨立。
- Skip 只影響 presentation，不得回滾、取消或重複執行已由 Game Logic 完成的效果結算。

### 視覺與 UX 邊界

禁止把需求實作成下列形式：

- 常駐「戰況提示」區域作為主要動畫舞台。
- 右下角或其他角落的 floating notification 作為主要 presentation。
- `pointer-events: none` 的提示層，讓玩家在動畫播放中繼續操作。
- 只有一個置中的大型 Dialog / Card，而四周仍只是普通遊戲 UI；full-screen 的意義不是單純把 panel 放大。
- 固定 3.6 秒 notification card 被視為完整技能演出。

目標應是：**遊戲畫面本身就是動畫舞台**。Overlay 可以是透明或半透明，角色 cut-in、技能字樣、全畫面 flash 與下層 target impact 可以共同組成一段演出。整個 overlay 同時也是 skip hit-area；玩家不需要尋找額外的「略過」按鈕即可跳過當前動畫。

### 最低驗收條件

後續程式修改至少需驗證：

1. 發動技能後，overlay 覆蓋完整 viewport，而不是佔據 layout 中的固定區塊。
2. 動畫播放期間，下層所有會改變遊戲狀態的控制項都不可直接操作。
3. 動畫播放期間，滑鼠點擊或 touch overlay 會立即跳過當前動畫，且該事件不可穿透到底下的遊戲 UI。
4. 當前動畫自然完成或被跳過後，如果 queue 已清空則 input lock 自動解除；若仍有後續連鎖事件則繼續下一段 presentation。
5. 連鎖事件會依序播放；跳過某一段只結束該段 presentation，不得重複結算或破壞後續 queue 順序。
6. actor / skill / card、target 與實際 `before → after` 結果仍可從現有 structured feedback 資料取得，不回頭解析 log string。
7. 教學關卡既有 interaction gate 與 presentation gate 不可互相繞過；動畫期間點擊應先被解讀為 skip，不得意外觸發教學指定控制項。
8. desktop 與 mobile viewport 都必須確認 overlay 真正覆蓋全畫面，且 pointer / touch 不會穿透；mobile touch 同樣可跳過當前動畫。
9. `prefers-reduced-motion` 下仍保留完整資訊、順序與 presentation gate，只減少非必要動態效果，並保留 click / touch to skip。

## 目前 branch 實作（待依上述需求重做 presentation layer）

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

目前 React 播放佇列與引擎完全分離，動畫播放的是已結算歷史，且遊戲可繼續操作。**這一點不符合上方修正後需求：資料與規則仍應分離，但 presentation 必須加入 input gate，在 queue 播放期間接管一般操作，並把 click / touch 解讀為跳過當前動畫。**

角色頭像直接使用既有 content 的 compactPortrait／portrait，透過 `resolvePublicAssetPath` 套用 Vite base；沒有新增、替換或提交圖片 binary，也沒有新增 dependency。

## 已完成驗證（針對目前 branch 實作）

以下驗證只代表目前 nonblocking 實作曾通過，不代表修正後的 full-screen blocking UX 已完成驗收。

- 新增 8 個觀察器 regression tests：技能代價與增益、非法發動、自動無變化、指定目標無變化、巢狀歸因、延遲卡牌來源、失敗後清理、有限歷史，以及有／無觀察器的完整回合狀態與 RNG 對照（部分情境合併在同一 test）。
- 教學 deterministic tests 納入完整測試。
- 瀏覽器實際完成教學：摸魚／創作切換 → 擲骰 → 格林技能及目標 → 骰子分配 → 指導及目標 → 真白複製骰及雙目標 → 三角希跨隊伍目標 → 結束回合 → 教學完成。
- 390 × 844 窄螢幕曾驗證目前提示 panel 與 floating notification；此項不能取代後續 full-screen overlay、touch-to-skip 與 viewport coverage 驗證。
- public asset resolver 既有 regression 涵蓋 `/aa-card-game/` 下的 portrait 與 compact 圖片。

## Figma 對照

目前 Figma 節點記錄的是舊的 notification / panel 方向，後續若重做 runtime layout，應同步更新或新增 full-screen presentation flow，不可把舊節點視為最終 UX source。

- [FeedbackImpact 三種效果列](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=9-256)
- [ActionFeedback 提示元件](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=10-250)
- [360px 窄版元件](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=10-260)
- [主畫面內的提示位置](https://www.figma.com/design/sNoL5F3tk7rCOiMSLm38TH?node-id=10-270)

已新增提示用色彩／間距／圓角共 12 個變數與字體樣式，確認使用 Noto Sans TC。這些既有 token 可視需要沿用，但不應限制新的 full-screen composition。

## 目前實作與目標需求差異

- **目前：** 短橫幅與固定「戰況提示」區域。  
  **目標：** full-screen overlay，遊戲畫面本身作為動畫舞台。
- **目前：** floating notification 使用 `pointer-events: none`，動畫期間可以繼續操作。  
  **目標：** presentation layer 捕捉輸入；click / touch 用來跳過當前動畫，且不可穿透到底下遊戲 UI。
- **目前：** 動畫只播放已結算歷史，interaction 與播放時鐘完全獨立。  
  **目標：** 規則結算仍可獨立，但 presentation queue 必須控制何時接受一般玩家 input。
- **目前：** 大量連鎖提示會排隊，但遊戲狀態可能已比正在播放的提示更新，玩家仍可操作。  
  **目標：** queue 可以照樣依序播放；每段可被 click / touch 跳過，但 queue 未完成前不得接受新的普通玩家操作。
- **目前：** 核心 presentation 是資訊卡與效果列。  
  **目標：** 角色 cut-in、技能／卡牌標題、全畫面 visual effect 與原位置 target impact 可以組成同一段 presentation，不受單一卡片容器限制。

## 先前最終檢查結果

以下只記錄修改需求前 branch 的基準狀態：

- `npm run typecheck`：通過。
- `npm run test`：31 個 test files、164 個 tests 通過（包含教學與 non-root asset regression）。
- `npm run build -- --base=/aa-card-game/`：通過；輸出的 HTML 使用 `/aa-card-game/assets/...`。
- `git diff --check`：通過。
- 最終手機瀏覽器驗證沒有 console error。
- Build 有 Zod 註解移除與單一 bundle 大於 500kB 的警告，未造成 build 失敗；本次未調整套件或拆分 bundle。