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

### Branch / release policy

- `main` 是 application source、deployment workflow 與 release-only UI behavior 的唯一 source-of-truth。
- `release` 只代表「目前部署中的版本」，不應直接維護任何只存在於 `release` 的 source code、workflow 或 UI 差異。
- GitHub Pages workflow 可以存在於 `main`，但只在 `release` branch push 時觸發部署。
- 發布時應從 `main` 建立臨時 release branch，再透過 PR 更新 `release`；不要直接在 `release` 上開發功能。
- 若 `release` 與 `main` 因歷史原因產生功能性差異，應先把必要差異移回 `main`，再同步 `release`，而不是長期維護兩套 source tree。

Repository 自帶的 `public/` 資源必須以 repository-relative reference 表示，例如：

```text
assets/characters/portrait/example.webp
assets/cards/guide.svg
```

不要在 content 或 component 中把 `/assets/...` 當成正式路徑。`/assets/...` 會指向 domain root，當應用部署在 `/aa-card-game/`、preview subpath、reverse proxy prefix 等環境時會請求到錯誤位置。

Browser runtime URL 應經由 Vite `import.meta.env.BASE_URL` 或專案共用 resolver 產生。例如 deployment base 為 `/aa-card-game/` 時：

```text
assets/characters/portrait/example.webp
-> /aa-card-game/assets/characters/portrait/example.webp
```

涉及 public asset path 的修改應包含 non-root base regression test，不能只在 Vite dev server 的 `/` 環境驗證。

## 圖片工具

Repository 內建通用圖片工具，避免手動轉檔後才在 runtime 發現尺寸或 WebP 損壞：

- `npm run image:inspect -- <file> [file...]`：顯示格式、尺寸、frame/page 數、色彩空間與檔案大小。
- `npm run image:check -- <file> --width N --height N --format webp --single-page --srgb`：檢查資源是否符合指定規格，失敗時回傳 non-zero exit code。
- `npm run image:webp -- <input> <output> [--width N --height N --fit cover|contain|fill --quality 82]`：轉成 sRGB WebP；指定尺寸時使用 Sharp resize。
- `npm run art:validate`：檢查所有角色 portrait / compact 是否完整配對，並驗證 WebP container、尺寸、單幀與 sRGB。
- `npm run test:image-tools`：只執行圖片工具測試；一般 `npm test` 也會自動包含這些測試。

角色圖正式規格仍以 `CHARACTER_CARD_ART.md` 為準。通用工具刻意不綁角色路徑，因此 cards、UI 素材或後續其他 WebP 也可使用。

## v0.4 重點

### 角色卡美術重新整理

舊版角色圖來自 concept board 的不規則裁切，容易出現頭部、卡框文字或安全區域錯位。v0.4 改成固定規格：

- 3:4 portrait
- 3:4 WebP；正式 runtime 規格為 768 x 1024
- runtime asset 不包含名稱、數值、技能文字與卡框
- 角色資訊由 React/MUI 統一 render
- `CharacterCard` 不再把 portrait 拉伸到整張資訊卡高度

目前 10 張 runtime portrait 都已規範化為 768 x 1024 WebP，並由 `npm run art:validate` 檢查尺寸、單幀與 WebP RIFF 完整性。Pintbox、79、真白、銀櫻、藍風、旁白的來源仍屬 legacy-quality，因此格式已統一不代表細節被重新生成。完整狀態見 `PROJECT_STATUS.md`。

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
- [`CHARACTER_AUTHORING.md`](./CHARACTER_AUTHORING.md)

## Repository 規範

- AI / coding agent：[`AGENTS.md`](./AGENTS.md)
- 相容入口：[`Agent.md`](./Agent.md)
- Contribution：[`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 角色美術：[`CHARACTER_CARD_ART.md`](./CHARACTER_CARD_ART.md)
- 上一輪驗證紀錄：[`VALIDATION.md`](./VALIDATION.md)
- 目前 runtime 規則：[`GAME_RULES.md`](./GAME_RULES.md)
- 實作與 Known gaps：[`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
- 討論整理：[`discussion-notes.md`](./discussion-notes.md)
- Figma / Storybook workflow：[`FIGMA.md`](./FIGMA.md)
- Repository-local agent skills：[`skills/README.md`](./skills/README.md)

## 目錄

```text
aa-card-game/
├─ public/
│  └─ assets/
│     ├─ characters/     # canonical 768x1024 WebP runtime portraits
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
- 目前 catalog 有 10 個 CharacterDefinition；卡奧斯帶 not-standard-playable，不進一般 3v3

這仍是 Prototype，不代表 Discord 討論中的所有規則都已定案或實作。
