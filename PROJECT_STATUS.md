# Project Status

本文件記錄目前 `main` 的實作狀態與已知缺口。

## Runtime roster

| id | 顯示名稱 | Standard 3v3 | Portrait | 主要狀態 |
| --- | --- | --- | --- | --- |
| pintbox | Pintbox | Yes | 192×256 | AI 已實裝；審稿 partial |
| mashiro | 真白 | Yes | 192×256 | 全適性、骰值複製已實裝 |
| user79 | 79 | Yes | 192×256 | 共鳴、虛之會圈已實裝 |
| narrator | 旁白 | Yes | 192×256 | 主要技能 planned |
| ginsakura | 銀櫻 | Yes | 192×256 | 主要技能 planned |
| bluewind | 藍風 | Yes | 192×256 | 妄想全開已實裝 |
| triangle | 三角希＆有希 | Yes | 768×1024 | 雙人卡；回復、全適性已實裝；統籌權限 planned |
| fengyang | 風揚 | Yes | 768×1024 | 商業作者已實裝 |
| happy | 高興 | Yes | 768×1024 | 高興、編輯長已實裝 |
| chaos | 卡奧斯 | No | 768×1024 | Boss resource / no-stress / roll floor 已實裝；Boss mode 未完成 |

## Character art gap

正式規格是 **768×1024 WebP / 3:4**。

目前仍有六張 legacy-size asset：

- `pintbox.webp`
- `user79.webp`
- `mashiro.webp`
- `ginsakura.webp`
- `narrator.webp`
- `bluewind.webp`

它們都是 192×256，比例正確但解析度**不符合目前正式規格**。後續應重新生成或由合格母版輸出 768×1024；不可用 upscale 假裝成正式母版。

目前已符合 768×1024：

- `happy.webp`
- `triangle.webp`
- `fengyang.webp`
- `chaos.webp`

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
