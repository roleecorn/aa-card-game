# Validation

最後更新：v0.4.0

## 本輪已執行

### Source-level TypeScript parse

使用本機 TypeScript 5.8.3 parser 掃描 `src/**/*.ts`, `src/**/*.tsx` 與 `vite.config.ts`：

- 掃描檔案：30
- Syntax diagnostics：0
- Missing relative imports：0

這項檢查不等同完整 `tsc -b`，因為正式 dependency 尚未能從 npm registry 安裝。

### Character asset validation

六張 runtime portrait 均已驗證：

- `pintbox.webp` — 768 x 1024
- `user79.webp` — 768 x 1024
- `mashiro.webp` — 768 x 1024
- `ginsakura.webp` — 768 x 1024
- `bluewind.webp` — 768 x 1024
- `narrator.webp` — 768 x 1024

所有 `CharacterDefinition.portrait` reference 都能對應到實際檔案。

### Previous engine runtime smoke

v0.3 已對真正的 `EngineSession + SkillRuntime + EffectRegistry` 執行 runtime smoke，涵蓋：

- Pintbox `AI`
- 79 `虛之會圈`
- 79 `共鳴`
- dice modify / convert / remove
- progress clear
- injectable `GameContent`
- 完整 5 回合 player + enemy AI 流程

v0.4 未修改上述 game-rule pipeline，主要變更為角色美術、CharacterCard layout 與 repository 規範文件。

## 尚未完成：正式 npm build

本環境執行：

```bash
npm install --ignore-scripts
```

仍無法連線 npm registry：

```text
GET https://registry.npmjs.org/@emotion%2freact
EAI_AGAIN
```

因此本輪不能宣稱以下命令已通過：

```bash
npm run typecheck
npm run test
npm run build
```

在可正常存取 npm registry 的環境取得 dependency 後，應執行：

```bash
npm install
npm run verify
```
