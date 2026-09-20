# Runtime UI Object Conventions

本文件定義 repository 中**由 React / MUI 繪製、不是獨立圖片檔的 reusable visual object**。Asset 檔案本身仍由 `ASSET_CONVENTIONS.md` 管理。


## 1. Source-of-truth hierarchy

- **Foundation / runtime theme**：`src/app/theme.ts`
- **Production implementation**：`src/components/*.tsx`
- **Isolated runtime states**：同名 `*.stories.tsx`
- **Binary / SVG art**：`ASSET_CONVENTIONS.md` 及 family-specific asset spec

新增 reusable UI object 前，必須先找下表中職責最接近的 production component。能表達成既有 component 的 prop / variant / composition 時，不另建第二套同語意物件。

## 2. Canonical visual-object registry

| Family | Production reference | Storybook reference | Canonical role |
| --- | --- | --- | --- |
| Battle character card | `src/components/CharacterCard.tsx` | `CharacterCard.stories.tsx` | 對局中角色狀態、能力值、適性、Stress/resource、技能與行動 |
| Pre-match character selection card | `src/components/CharacterSelectionCard.tsx` | `CharacterSelectionCard.stories.tsx` | 選角／初始抽角的角色 presentation；是 character-card family 的 selection variant，不是第二份角色資料模型 |
| Hand card | `src/components/HandCard.tsx` | `HandCard.stories.tsx` | 手牌中的統籌／事件卡，顯示 canonical card SVG、名稱、類型與規則摘要 |
| Work card | `src/components/WorkCard.tsx` | `WorkCard.stories.tsx` | 作品資訊、類型、進度 slot、完成度、Score 與放骰 targeting |
| Pending die token | `src/components/DieToken.tsx` | `DieToken.stories.tsx` | 待分配／可互動骰子，包含 owner tooltip、能力類型、點數、selected state |

### Character selection is a variant, not a new character schema

`CharacterSelectionCard` 使用同一 `CharacterDefinition`、角色 portrait、stats、`CharacterAffinities` 與 skill catalog。它可以因選角流程需要採用較大的 portrait、card-back flip、`full` / `rail` variant，但不得另建角色數值、適性或技能的平行資料來源。

### Pending die vs placed-die mark

`DieToken` 是 58×58 的**互動 pending die object**，顯示能力 icon / label / value，並支援 selected state。

`WorkCard` 內的 22×22 `DiceFace` 是**作品進度格內的 compact placed-value mark**，採骰點圖形以節省 slot 空間，不是另一種 pending die。這兩者語意與 interaction 不同，因此 geometry 可以不同；若未來需要第三種骰子 presentation，必須先判斷它是否能成為這兩者的 variant，再決定是否新增 family。

## 3. Collection components

以下 component 是 layout / collection，不建立自己的 item visual language：

- `CardHand`：排列 `HandCard`
- `DiceTray`：排列 `DieToken`
- `WorkBoard`：排列 `WorkCard`
- `TeamColumn`：組合角色／隊伍資訊

Collection 應重用 registered primitive，而不是在 collection 內重新畫一份近似卡片或骰子。

## 4. Foundation rules from the existing theme

`src/app/theme.ts` 是 runtime foundation：

- light mode；default background `#fbfaf8`、paper `#ffffff`；
- primary `#4b93dc`、secondary `#ff7587`、success `#4db8a8`、warning `#f6bb4f`；
- primary text `#303645`、secondary text `#687083`；
- global shape radius 14；
- UI font family starts with `AA Noto Sans TC`；
- buttons use non-uppercase bold labels；
- Card has a shared light border；
- coarse pointer / narrow mobile controls keep at least 44px touch target for Button / IconButton / ToggleButton；
- mobile dialogs use 12px viewport margin and constrained dynamic-viewport height。

Individual game objects may use role-specific accent colors already present in their production component, but a new object must first reuse the closest existing component palette / theme token. Do not create a parallel global palette inside a new component.

## 5. Existing object-specific language

### CharacterCard

Reference: `CharacterCard.tsx`.

- portrait and data remain separate layers;
- normal and compact states are variants of the same component;
- Design / Text / AA use the existing pink / blue / teal semantic accents;
- affinities are rendered through shared `CharacterAffinities`;
- skill display uses shared `SkillList`;
- Stress/resource uses MUI progress semantics rather than baked art;
- blocked actions remain visible with an explanatory disabled state rather than silently disappearing.

### CharacterSelectionCard

Reference: `CharacterSelectionCard.tsx`.

- reuses the same character definition and portrait source;
- `full` is the main candidate card; `rail` is the already-picked compact presentation;
- selected state is an explicit border/badge state;
- optional card-back → face animation belongs to the draw/selection flow only;
- stat / affinity / tag / skill content must remain derived from shared catalog data.

### HandCard

Reference: `HandCard.tsx`.

- fixed 150px card width in the hand presentation;
- coordination and event cards use the existing teal / pink family distinction;
- illustration keeps 8:5 geometry and uses the card definition's canonical SVG;
- name/rule text stays React-rendered and is never baked into SVG art;
- disabled state keeps the card visible, reduces emphasis and exposes a reason/tooltip.

### WorkCard

Reference: `WorkCard.tsx`.

- tone comes from the existing `workCardTones` family;
- title + work type form the header;
- horizontal slot overflow is intentional for long works;
- progress order is Design / Text / AA;
- completed slot uses the canonical bundled SVG stamp from `src/assets`;
- targeting legality changes border/opacity/cursor while keeping the slot structure stable.

### DieToken

Reference: `DieToken.tsx`.

- 58×58 interactive pending-die geometry;
- Design / Text / AA retain their existing semantic accent colors;
- owner/origin belongs in tooltip context;
- selection is represented through border + focus-like outer ring, not a second die component.

## 6. Storybook contract

A reusable visual primitive must have a colocated Storybook file that covers its material visual states. Current required references:

- `CharacterCard`: Default / Compact / HighStress / WithActions
- `CharacterSelectionCard`: Full / Rail / Selected / CardBack
- `HandCard`: Support / Event / Tilted
- `WorkCard`: Default / BlueTone / AssigningDie
- `DieToken`: Design / Text / AA / Selected

Stories run under the same `ThemeProvider` and `CssBaseline` as production via `.storybook/preview.tsx`. A story may use deterministic catalog fixtures, but must not define a second visual implementation of the object.

When a new prop introduces a materially different reusable visual state, update the existing story before or with the production change.

## 7. Reference-first gate for new UI objects

Before adding a reusable visual object:

1. identify the closest registered family and production file;
2. decide whether the need is a prop/variant/composition of that family;
3. reuse `theme.ts`, shared subcomponents and semantic state conventions;
4. if a truly new family is required, add it to this registry and define its production + Storybook reference in the same change;
6. run Storybook/runtime review in addition to source tests for visual changes.

A component existing somewhere in the repository is not automatically a design precedent. One-off screen layout, legacy code and duplicated markup must not become a new family without an explicit registry decision.

## 8. Automated enforcement

`scripts/ui-object-contract.test.ts` protects structural parts of this contract:

- the runtime Storybook preview must use the production `theme` through `ThemeProvider`;
- every registered reusable visual primitive must have both production and Storybook files;
- each story must declare the expected `Game/<Component>` boundary;
- `CharacterSelectionCard` must keep shared character data/subcomponent references rather than a parallel character model;
- collection components remain separate from the primitive registry.
