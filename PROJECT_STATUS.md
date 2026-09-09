# Project Status

本文件記錄目前 `main` 的實作狀態與已知缺口。

## Runtime roster

| id | 顯示名稱 | Standard 3v3 | Portrait | 主要狀態 |
| --- | --- | --- | --- | --- |
| pintbox | Pintbox | Yes | 768×1024 | AI 已實裝；審稿 partial |
| mashiro | 真白 | Yes | 768×1024 | 全適性、骰值複製已實裝 |
| user79 | 79 | Yes | 768×1024 | 共鳴、虛之會圈已實裝 |
| narrator | 旁白 | Yes | 768×1024 | 主要技能 planned |
| ginsakura | 銀櫻 | Yes | 768×1024 | 主要技能 planned |
| bluewind | 藍風 | Yes | 768×1024 | 妄想全開已實裝 |
| triangle | 三角希＆有希 | Yes | 768×1024 | 雙人卡；回復、全適性已實裝；統籌權限 planned |
| fengyang | 風揚 | Yes | 768×1024 | 商業作者已實裝 |
| happy | 高興 | Yes | 768×1024 | 高興、編輯長已實裝 |
| chaos | 卡奧斯 | No | 768×1024 | Boss resource / no-stress / roll floor 已實裝；Boss mode 未完成 |

## Character art status

目前 10 張 runtime portrait 都已通過 canonical validation：

- WebP
- 768×1024
- 3:4
- sRGB
- single-frame
- RIFF 宣告長度 = 實際 Git blob bytes

2026-09-09 audit 曾發現 `happy / triangle / fengyang / chaos` 的 GitHub WebP blob 被截斷，因此檔案存在但無法預覽。現在 `scripts/character-art.ts` 與 CI 會直接拒絕這類 truncated WebP。

Pintbox、79、真白、銀櫻、旁白、藍風這六張是從既有 legacy-quality 素材規範化成 768×1024 runtime derivative；格式已一致，但這次沒有重新生成美術，不應把 upscale 說成新增高解析細節。

## Known rules gaps

- 銀櫻兩個技能的完整觸發限制 / 數值在來源裡不完整，因此維持 planned。
- 旁白兩個技能尚未完整落成 runtime effect。
- 三角希＆有希的角色級統籌卡 permission 缺少 card actor identity。
- Boss mode 尚未建立；卡奧斯不進 Standard 3v3。
- Standard match 的 3v3 隨機組隊是 Prototype decision，不是原始討論已定案規則。
- 部分角色作品適性與未列能力值使用 prototype assumption，應查看各角色 `sourceNotes`。

## UI / design

- Runtime UI：React + MUI。
- Layout design：Figma。
- Runtime state 預覽：Storybook。
- 真正 UI 驗證：Vite + Chrome screenshot，不以 Figma screenshot 代替。

## Validation baseline

最近完整驗證的角色內容 chain head：

`76c2e50a79b21d1349940dd034f3f3462843cab0`

GitHub Actions `UI Screenshot` 已成功執行：

- dependency install
- TypeScript typecheck
- Vitest
- Vite dev server
- headless Chrome runtime render

Production `npm run build` 不包含在該 workflow 中；release 前仍應另外跑 `npm run verify`。
