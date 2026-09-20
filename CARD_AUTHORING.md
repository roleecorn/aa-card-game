# Card Authoring

本文件定義 `CardDefinition` 的 canonical authoring contract。內容整理自目前 production `schema.ts`、`cards.ts`、`targeting.ts`、`cardHandlers.ts`、`EngineSession.playCard()` 與 `match.ts`；不是新卡牌規則。

## 1. Source of truth

- Schema：`src/game/schema.ts` 的 `cardDefinitionSchema`
- Card definitions：`src/content/cards.ts`
- Catalog：`src/content/catalog.ts` 的 `CARDS`
- Standard deck composition：`src/content/match.ts` 的 `BASE_DECK`
- Generic target availability / candidate legality：`src/game/targeting.ts`
- Custom card mechanics：`src/game/cardHandlers.ts`
- Runtime execution order：`src/game/engine.ts` 的 `playCard()`
- Runtime hand presentation：`src/components/HandCard.tsx`
- Card illustration：`CARD_ART_STYLE.md`

新增卡牌時必須先找 `src/content/cards.ts` 中 target / effect 形態最接近的既有卡作 reference；如果現有 vocabulary 能表達，不新增平行 mechanic。

## 2. Canonical `CardDefinition`

目前 schema 欄位：

| Field | Rule |
| --- | --- |
| `id` | repository-unique、穩定的 lower camelCase identifier |
| `name` | 玩家向名稱 |
| `kind` | `coordination` 或 `event` |
| `description` | 玩家向、與目前 runtime 行為一致的簡短規則文字 |
| `art` | runtime card SVG path；正式卡應使用 `cardArt('<kebab-name>.svg')` |
| `coordinationStressCost` | 只有 coordination card 有意義；省略時 runtime 預設為 1 |
| `target` | declarative target contract，優先於 handler 內自行拒絕 target |
| `effects` | 可由共用 effect vocabulary 表達的效果 |
| `customHandler` | 只有無法合理用 effects 表達的複合流程才使用 |
| `ai` | Standard AI auto-use metadata；沒有需求可省略 |

所有 definitions 必須通過 `cardDefinitionSchema`。不要在 UI component 內建立卡牌 ID 特判來補足缺失的 definition metadata。

## 3. Card kind and coordination Stress

### Coordination card

`kind: 'coordination'` 的一般規則：

- 由目前組長使用；
- 組長若具有 `coordinationDisabledAsLeader` 狀態則不能使用；
- `coordinationStressCost` 未指定時預設為 1；
- runtime 會先確認存在合法 pressure bearer，沒有合法承擔者時不能使用；
- 成功 resolve 後才實際支付 coordination Stress。

特殊卡若不支付通常費用，必須像 `guide` 一樣明確設定 `coordinationStressCost: 0`，不能把免付費語意藏在 custom handler。

### Event card

`kind: 'event'` 不使用 coordination Stress contract。不要在 event card 填 `coordinationStressCost`；authoring contract test 會拒絕這種無效 metadata。

## 4. Target vocabulary

目前 `CardDefinition.target` 只允許：

- `{ kind: 'none' }`
- `{ kind: 'member', relation: 'ally' | 'enemy', skillPicker?: boolean }`
- `{ kind: 'work', relation: 'ally' | 'enemy' }`
- `{ kind: 'voiceMode' }`
- `{ kind: 'polishMode' }`

`src/game/targeting.ts` 是 player-facing availability / candidate legality 的共用邊界。新增 target kind 時，不能只擴 schema；至少要同步：

1. `cardDefinitionSchema`
2. `SkillActivationTarget` / target payload（如需要）
3. `EngineSession.validateCardTarget()`
4. `getCardAvailability()` 與 candidate generation
5. `CardPlayDialog` / 對應 UI selector
6. deterministic target-legality regression
7. 本文件

### No target dead-end

若卡牌目前沒有任何合法 target，應在出牌前就被 `getCardAvailability()` 阻擋，不得先讓玩家發動再進入空的選擇畫面。

目標可選但效果可能被 immunity 無效時，優先回傳 warning，而不是把合法 target 偽裝成不可選；現有 external-effect warning 是 reference。

## 5. Effects first, custom handlers only when needed

優先使用共用 `effects` vocabulary，例如：

- Stress change
- status change
- roll-face constraint
- work mutation
- dice grant / conversion（vocabulary 可表達時）

只有需要排序、重複流程、依 runtime 值分支、特殊骰子選擇等複合處理時才使用 `customHandler`。目前 references：

- `oneOnOne`
- `guide`
- `voice`
- `polish`
- `rush`

任何 `customHandler` 字串都必須在 `src/game/cardHandlers.ts` registry 真實註冊；`scripts/card-authoring-contract.test.ts` 會用 `hasCardHandler()` 驗證，不允許等到實際出牌才發現 typo。

Custom handler 回傳 `true` 表示這張卡已成功 resolve，可以被消耗；回傳 `false` 代表整次使用失敗，卡片不應被棄掉。若 target 合法但外部 immunity 使效果無效，現有 handler 會依卡牌語意選擇「成功使用但效果被免疫」，不要把 immunity 誤當成資料錯誤。

## 6. Runtime resolution order

目前 `EngineSession.playCard()` 的 canonical 順序：

1. game / hand / leader / coordination-use legality
2. coordination Stress bearer feasibility
3. target validation
4.建立 `cardPlayed` context
5. 執行 declarative `effects`
6. 執行 `customHandler`（若有）
7. 若沒有任何效果成功，整次使用失敗
8. 從 hand 移除並加入 discard
9. 支付 coordination Stress（如適用）
10. emit `cardPlayed` event 給角色技能/runtime listeners

新增卡牌不可在 UI 先行修改 GameState，或建立另一條繞過 `playCard()` 的出牌流程。

## 7. Definition and deck membership are separate

`CARDS` 表示 runtime 已知的卡牌 definitions；`BASE_DECK` 表示 Standard match 實際會抽到的 card IDs。兩者不是同一概念。

例如 `reconsider` 可以保留為 compatibility card definition 與合法 SVG，即使它已從 Standard deck 移除。

規則：

- `cardList` 不得有重複 ID；否則 `toRecord()` 會覆蓋前項，contract test 會阻擋；
- `BASE_DECK` 的每個 ID 必須存在於 `CARDS`；
- 從 Standard deck 移除卡牌不代表要刪除 definition；是否保留 compatibility 必須是明確決策；
- deck 數量／比例變更屬 gameplay data，必須同步 `GAME_RULES.md` / `GAME_MANUAL.md` / 相關 status docs。

## 8. Art and presentation

正式 individual card art 使用 `public/assets/cards/*.svg`，完整格式與 reference-first 規則見 `CARD_ART_STYLE.md`。

`HandCard.tsx` 是 runtime presentation reference：

- coordination / event 類型以既有 teal / pink family 區分；
- art 保持 8:5；
- 名稱、種類、規則文字由 React render，不烘焙進 SVG；
- disabled card 仍顯示並提供 reason / tooltip。

新增卡牌不要為了特殊外觀 fork 第二個 hand-card component；先判斷是否可由既有 `HandCard` 與 definition metadata 表達。

## 9. AI metadata

`ai` 目前支援：

- `autoUse`
- `priority`
- `when: 'always' | 'enemyLowestHeadroom' | 'allyStressAtLeast2'`

只有 Standard AI 真正需要的判斷才加入。新增 `when` vocabulary 時要同步 schema、AI runtime 與 deterministic regression；不要把複雜 gameplay legality 藏在 AI metadata，合法性仍由同一 targeting/runtime contract 決定。

## 10. Testing requirements

新增或修改卡牌至少確認：

1. schema parse 成功；
2. `id` 唯一；
3. `BASE_DECK` reference 有效（若有加入 deck）；
4. target availability 與 runtime validation 一致；
5. 沒有合法 target 時不會產生 UI dead-end；
6. declarative effect 或 custom handler 真實 resolve；
7. custom handler reference 已註冊；
8. coordination Stress / bearer interaction 正確；
9. immunity / status / roll constraint 等交互作用有需要時補 cross-mechanic regression；
10. art 通過 `CARD_ART_STYLE.md` contract；
11. Standard / Online 共用 Engine 行為沒有被 UI fork；
12. `description` 與玩家向文件同步。

Focused authoring contract：

```bash
npm run test:cards
```

完整驗證仍使用：

```bash
npm run verify
```

## 11. Adding a new card mechanic

只有在現有 target/effect/handler pattern 無法合理表達時才新增 vocabulary：

1. 指出最接近的既有卡與為何不足；
2. 先定義 schema / target / effect contract；
3. 更新 runtime + player-facing legality；
4. 更新 UI selector（若需要）；
5. 加 deterministic regression；
6. 更新本文件與玩家規則文件；
7. 最後才新增第一張使用該 vocabulary 的卡。

這與 repository 的 reference-first gate 相同：**一張新卡不應順便創造一條只有它自己知道的第二套出牌系統。**