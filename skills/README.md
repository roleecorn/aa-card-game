# Repository-local Agent Skills

這個目錄保存針對本 repository 的可重用工作流程。

這些 `SKILL.md` 是 repository-level instructions；不同 coding agent 是否原生自動 discovery 取決於工具本身，因此 `AGENTS.md` 也會明確要求在相關任務前讀取對應 skill。

目前：

- `character-package/SKILL.md`：新增／完成角色，包含美術與 atomic commit。
- `discussion-grounding/SKILL.md`：根據 Discord 討論判定 source-backed / assumption。
- `runtime-ui-validation/SKILL.md`：取得真正程式 runtime UI，不以 Figma mockup 替代。
