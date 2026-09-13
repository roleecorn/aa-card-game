# AA Group Card Game Prototype

基於 Discord 討論內容整理出的 TypeScript Web 卡牌遊戲 Prototype。規則主要以 Pintbox 的討論為基礎；尚未定案的部分以 prototype assumption 處理。

目前版本：**v0.4.0**

## 目前可玩的內容

- Standard 對局固定 5 回合。
- 開始遊戲後可選 **3 人模式**或 **5 人模式**。
- 隊伍角色數與作品數相同：3 人模式每隊 3 部作品，5 人模式每隊 5 部作品。
- 目前 runtime catalog 共 **39 名角色**；卡奧斯由 Standard match configuration 排除，因此 Standard 可抽取 **38 名角色**。
- 支援角色主動／被動／觸發技能、統籌卡與事件卡、Stress、作品適性、作品進度、組長接任、hidden／神隱等 runtime mechanic。
- 另有固定 roster / 固定抽牌 / deterministic RNG 的教學關卡。

目前程式實際規則以 [`GAME_RULES.md`](./GAME_RULES.md) 為準；玩家向完整說明見 [`GAME_MANUAL.md`](./GAME_MANUAL.md)。

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
npm run test:tutorial
npm run art:normalize
npm run art:validate
npm run image:inspect -- <file>
npm run image:check -- <file> --width 768 --height 1024 --format webp --single-page --srgb
npm run image:webp -- <input> <output> --width 768 --height 1024 --fit cover
npm run test:image-tools
npm run storybook
```

## 部署與資源路徑

這個 Web app **不假設部署在網站根目錄 `/`**。正式 release 目前由 GitHub Pages 掛在 repository 子路徑，因此 Vite build 會使用類似 `/aa-card-game/` 的 `base`。

Repository 自帶的 `public/` 資源使用 repository-relative reference，例如：

```text
assets/characters/portrait/example.webp
assets/characters/compact/example.webp
assets/cards/guide.svg
```

不要在 content 或 component 中把 `/assets/...` 當成正式路徑。Browser runtime URL 應經由 Vite `import.meta.env.BASE_URL` 或專案共用 `resolvePublicAssetPath` 解析。

例如 deployment base 為 `/aa-card-game/` 時：

```text
assets/characters/portrait/example.webp
-> /aa-card-game/assets/characters/portrait/example.webp
```

涉及 public asset path 的修改應包含 non-root base regression test，不能只在 Vite dev server 的 `/` 環境驗證。

## Branch / release policy

- `main` 是 application source、deployment workflow 與 release UI behavior 的 source of truth。
- `release` 代表目前部署中的版本，不應直接維護只存在於 `release` 的 source code、workflow 或 UI 差異。
- GitHub Pages workflow 可存在於 `main`，但由 `release` branch push 觸發部署；一般 `main` 更新只跑 CI。
- 發布時建立 `main -> release` PR；實際 merge 前仍必須依 repository policy 完成人工測試與人工確認。
- 完整流程見 [`docs/release-flow.md`](./docs/release-flow.md)。

## 圖片工具與角色美術

Runtime 角色圖片分成：

```text
public/assets/characters/portrait/<character-id>.webp
public/assets/characters/compact/<character-id>.webp
```

正式 portrait 規格為 3:4、768 × 1024 WebP；compact slot 為 384 × 320 WebP。名稱、數值、技能文字與卡框由 React/MUI render，不烘焙到 raster art。

Repository 內建圖片工具：

- `npm run image:inspect -- <file> [file...]`：顯示格式、尺寸、frame/page 數、色彩空間與檔案大小。
- `npm run image:check -- <file> ...`：檢查單一資源規格。
- `npm run image:webp -- <input> <output> ...`：轉成 sRGB WebP。
- `npm run art:normalize`：正規化 portrait，並從 canonical portrait 重建 compact。
- `npm run art:validate`：檢查 portrait / compact 配對、WebP container、尺寸、單幀與 sRGB。

角色圖完整規格見 [`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)。

## 規則與內容架構

角色技能不應散落成 `GameEngine` 裡的角色特判。主要流程為：

```text
Game Event
  -> SkillRuntime
  -> Conditions
  -> EffectRegistry / customEffects
  -> Game State
```

角色採 per-character package：

```text
src/content/<character-id>.ts
```

同一 package 保存該角色的 `CharacterDefinition` 與角色專屬 `SkillDefinition`。`src/content/catalog.ts` 只負責聚合、索引與 reference validation；Standard roster / deck / match constants 由 `src/content/match.ts` 管理。

詳細內容：

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`SKILL_AUTHORING.md`](./SKILL_AUTHORING.md)
- [`CHARACTER_AUTHORING.md`](./CHARACTER_AUTHORING.md)

## Repository 文件

- AI / coding agent：[`AGENTS.md`](./AGENTS.md)
- Contribution：[`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Runtime 規則：[`GAME_RULES.md`](./GAME_RULES.md)
- 玩家向遊戲說明：[`GAME_MANUAL.md`](./GAME_MANUAL.md)
- 實作狀態 / Known gaps：[`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
- 架構：[`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Skill authoring：[`SKILL_AUTHORING.md`](./SKILL_AUTHORING.md)
- Character authoring：[`CHARACTER_AUTHORING.md`](./CHARACTER_AUTHORING.md)
- 角色美術：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)
- 歷史驗證紀錄：[`VALIDATION.md`](./VALIDATION.md)
- 討論整理：[`discussion-notes.md`](./discussion-notes.md)
- Figma / Storybook workflow：[`FIGMA.md`](./FIGMA.md)
- Release workflow：[`docs/release-flow.md`](./docs/release-flow.md)
- Repository-local agent skills：[`skills/README.md`](./skills/README.md)

## 目錄

```text
aa-card-game/
├─ public/
│  └─ assets/
│     ├─ characters/
│     │  ├─ portrait/
│     │  └─ compact/
│     └─ cards/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ content/           # per-character packages / cards / match / catalog
│  ├─ game/              # engine / skill runtime / effect registry
│  ├─ store/
│  ├─ tutorial/
│  └─ tests/
├─ docs/
├─ AGENTS.md
├─ GAME_RULES.md
├─ GAME_MANUAL.md
├─ PROJECT_STATUS.md
└─ README.md
```

## Prototype rule summary

- 5 回合。
- 3 人或 5 人小隊。
- 每名角色各有一部作品。
- Progress 依 `Design -> Text -> AA`。
- 角色能力值決定工作骰數量。
- 高骰可以覆蓋同類型低骰。
- Work 通常增加 Stress；Slack 降低 Stress。
- 作品類型為 `燃 / 謀 / 笑 / 情 / 色 / 怪`。
- 角色技能與卡牌效果共用 data-driven effect pipeline。
- Standard roster eligibility 由 match configuration 管理，不由 Character Tag 決定。

這仍是 Prototype，不代表 Discord 討論中的所有規則都已定案或實作。
