# AA Group Card Game Prototype

基於 Discord 討論內容整理出的 TypeScript Web 卡牌遊戲 Prototype。規則主要以 Pintbox（Discord user id `706774301805903892`）的討論為基礎；尚未定案的部分以 prototype assumption 處理。

目前版本：**v0.4.0**

## 技術棧

- TypeScript
- React
- Vite
- MUI
- Zustand + Immer
- Zod
- Vitest
- Storybook
- nanoid

設計原則是盡量使用既有 TypeScript ecosystem，不自行建立大型 UI framework、state framework 或 CSS system。

## 執行

需求：Node.js `^20.19.0 || >=22.12.0`

```bash
npm install
npm run dev
```

常用指令：

```bash
npm run typecheck
npm run test
npm run build
npm run verify
npm run storybook
```

## v0.4 重點

### 角色卡美術重新整理

舊版角色圖來自 concept board 的不規則裁切，容易出現頭部、卡框文字或安全區域錯位。v0.4 改成固定規格：

- 3:4 portrait
- 3:4 WebP；生成母版建議至少 768 x 1024，目前 runtime derivative 為 192 x 256
- runtime asset 不包含名稱、數值、技能文字與卡框
- 角色資訊由 React/MUI 統一 render
- `CharacterCard` 不再把 portrait 拉伸到整張資訊卡高度

目前 Pintbox、79、真白、銀櫻、藍風、旁白皆已替換成重新整理後的標準化 asset。

詳細規格：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)

### 可擴充 Skill System

角色技能不應散落成 GameEngine 裡的角色特判。主要流程為：

```text
Game Event
  -> SkillRuntime
  -> Conditions
  -> EffectRegistry
  -> Game State
```

角色與卡牌可共用 generic effects。詳細內容：

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`SKILL_AUTHORING.md`](./SKILL_AUTHORING.md)

## Repository 規範

- AI / coding agent：[`AGENTS.md`](./AGENTS.md)
- 相容入口：[`Agent.md`](./Agent.md)
- Contribution：[`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 角色美術：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)
- 上一輪驗證紀錄：[`VALIDATION.md`](./VALIDATION.md)
- 討論整理：[`discussion-notes.md`](./discussion-notes.md)
- Figma / Storybook workflow：[`FIGMA.md`](./FIGMA.md)

## 目錄

```text
aa-card-game/
├─ public/
│  └─ assets/
│     ├─ characters/     # 3:4 WebP runtime portraits
│     └─ cards/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ content/           # characters / skills / cards / match
│  ├─ game/              # engine / skill runtime / effect registry
│  ├─ store/
│  └─ tests/
├─ docs/
│  └─ art/               # compressed design references; not runtime
├─ AGENTS.md
├─ CHARACTER_CARD_ART.md
├─ CONTRIBUTING.md
├─ ARCHITECTURE.md
├─ SKILL_AUTHORING.md
├─ VALIDATION.md
└─ discussion-notes.md
```

## 目前 Prototype 規則概要

- 5 回合
- 雙方各 3 名組員
- 作品 progress 依 `Design -> Text -> AA`
- 角色能力值決定工作骰數量
- 高骰可以覆蓋同類型低骰
- 工作增加 Stress；摸魚降低 Stress
- 作品具有 `燃 / 謀 / 笑 / 情 / 色 / 怪` 適性
- 角色被動、主動技能與卡牌效果透過同一套 effect pipeline 執行

這仍是 Prototype，不代表 Discord 討論中的所有規則都已定案或實作。
