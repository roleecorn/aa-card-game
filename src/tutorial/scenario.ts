import type { SkillStat } from '../game/schema';
import type { ActionChoice } from '../game/types';

export type TutorialStepId =
  | 'grimm-slack'
  | 'grimm-work'
  | 'perform-work'
  | 'grimm-skill'
  | 'grimm-target'
  | 'dice-select'
  | 'work-slot'
  | 'card-guide'
  | 'card-target'
  | 'mashiro-skill'
  | 'mashiro-target'
  | 'triangle-skill'
  | 'triangle-target'
  | 'end-turn'
  | 'complete';

export interface TutorialRuntimeState {
  step: TutorialStepId | null;
  randomIndex: number;
}

export type TutorialEvent =
  | { type: 'actionChanged'; memberId: string; action: ActionChoice }
  | { type: 'playerActionsPerformed' }
  | { type: 'dieSelected'; ownerId: string; skill: SkillStat }
  | { type: 'diePlaced'; ownerId: string; skill: SkillStat; workOwnerId?: string }
  | { type: 'cardDialogOpened'; cardId: string }
  | { type: 'cardResolved'; cardId: string; success: boolean }
  | { type: 'cardDialogClosed'; cardId?: string }
  | { type: 'skillDialogOpened'; memberId: string; skillId: string }
  | { type: 'skillResolved'; memberId: string; skillId: string; success: boolean }
  | { type: 'skillDialogClosed'; memberId?: string; skillId?: string }
  | { type: 'playerAssignmentFinished' }
  | { type: 'dismissed' };

export interface TutorialGuideDefinition {
  title: string;
  purpose: string;
  function: string;
  instruction: string;
  selector?: string;
}

interface TutorialTransition {
  next: TutorialStepId | null;
  matches: (event: TutorialEvent) => boolean;
}

export interface TutorialStepDefinition extends TutorialGuideDefinition {
  transitions: readonly TutorialTransition[];
}

export const TUTORIAL_DIALOG_SELECTOR = '[role="dialog"]';

const transition = (
  next: TutorialStepId | null,
  matches: (event: TutorialEvent) => boolean,
): TutorialTransition => ({ next, matches });

export const TUTORIAL_SCENARIO: Record<TutorialStepId, TutorialStepDefinition> = {
  'grimm-slack': {
    title: '1. 選擇角色行動',
    purpose: '了解每名角色在回合開始時都能獨立決定要創作還是摸魚。',
    function: '「摸魚」會讓角色本回合不產生創作骰，適合在壓力或局勢不利時暫停行動。',
    instruction: '關閉說明後，請把格林改成「摸魚」。',
    selector: '[data-tutorial="action-grimm-slack"]',
    transitions: [transition('grimm-work', (event) => event.type === 'actionChanged' && event.memberId === 'grimm' && event.action === 'slack')],
  },
  'grimm-work': {
    title: '2. 切回創作',
    purpose: '確認角色的行動選擇可以在正式執行前個別調整。',
    function: '「創作」會讓角色依 Design、Text、AA 數值產生本回合可使用的骰子。',
    instruction: '關閉說明後，請把格林切回「創作」。',
    selector: '[data-tutorial="action-grimm-work"]',
    transitions: [transition('perform-work', (event) => event.type === 'actionChanged' && event.memberId === 'grimm' && event.action === 'work')],
  },
  'perform-work': {
    title: '3. 擲出本回合骰子',
    purpose: '把角色的行動選擇正式執行，產生本回合可以分配的創作骰。',
    function: '「進行創作」會一次結算所有角色的行動。教學關卡使用固定骰點，因此每次重玩結果都相同。',
    instruction: '關閉說明後，按下「進行創作」。',
    selector: '[data-tutorial="perform-work"]',
    transitions: [transition('grimm-skill', (event) => event.type === 'playerActionsPerformed')],
  },
  'grimm-skill': {
    title: '4. 發動指定骰技能',
    purpose: '學習主動技能如何在骰子分配前改變本回合資源。',
    function: '格林的「燃燒畫面」會讓自己壓力 +1，並把一顆尚未分配的 AA 骰 +2；這是一種用壓力交換輸出的技能。',
    instruction: '關閉說明後，發動格林的「燃燒畫面」。',
    selector: '[data-tutorial="skill-grimmBurningFrame"]',
    transitions: [transition('grimm-target', (event) => event.type === 'skillDialogOpened' && event.memberId === 'grimm' && event.skillId === 'grimmBurningFrame')],
  },
  'grimm-target': {
    title: '5. 在技能視窗選目標',
    purpose: '了解部分主動技能需要指定實際作用的骰子。',
    function: '「燃燒畫面」只能指定格林自己尚未分配的 AA 骰；選定後該骰點數會提高 2。',
    instruction: '關閉說明後，在技能視窗選擇格林自己的 AA 骰並確認。',
    selector: TUTORIAL_DIALOG_SELECTOR,
    transitions: [
      transition('dice-select', (event) => event.type === 'skillResolved' && event.memberId === 'grimm' && event.skillId === 'grimmBurningFrame' && event.success),
      transition('grimm-skill', (event) => event.type === 'skillResolved' && event.memberId === 'grimm' && event.skillId === 'grimmBurningFrame' && !event.success),
      transition('grimm-skill', (event) => event.type === 'skillDialogClosed'),
    ],
  },
  'dice-select': {
    title: '6. 選擇要放置的骰',
    purpose: '學習從本回合骰子中挑選一顆，準備投入作品。',
    function: '作品必須依 Design → Text → AA 的順序完成，因此第一顆要先從 Design 骰開始。',
    instruction: '關閉說明後，選擇一顆真白的 Design 骰。',
    selector: '[data-tutorial="die-mashiro-design"]',
    transitions: [transition('work-slot', (event) => event.type === 'dieSelected' && event.ownerId === 'mashiro' && event.skill === 'design')],
  },
  'work-slot': {
    title: '7. 放進作品',
    purpose: '學習把選中的骰子實際投入作品，推進作品完成度。',
    function: '骰子放入作品後就會占用該格；後續仍需按照 Design → Text → AA 的順序補齊作品需求。',
    instruction: '關閉說明後，把剛才選中的 Design 骰放進真白的作品。',
    selector: '[data-tutorial="work-mashiro"]',
    transitions: [transition('card-guide', (event) => event.type === 'diePlaced' && event.ownerId === 'mashiro' && event.skill === 'design' && event.workOwnerId === 'mashiro')],
  },
  'card-guide': {
    title: '8. 使用手牌',
    purpose: '了解支援卡可以在回合中提供額外效果，而不只依靠角色技能。',
    function: '「指導」是一張需要指定角色與能力的支援卡。教學中的起手牌與後續抽牌順序都是固定的。',
    instruction: '關閉說明後，點擊手牌中的「指導」。',
    selector: '[data-tutorial="card-guide"]',
    transitions: [transition('card-target', (event) => event.type === 'cardDialogOpened' && event.cardId === 'guide')],
  },
  'card-target': {
    title: '9. 指定卡牌目標',
    purpose: '學習需要目標的卡牌如何選擇作用對象。',
    function: '「指導」需要先指定一名我方角色，再指定該角色的一項能力，效果才會成立。',
    instruction: '關閉說明後，在卡牌視窗中選擇一名我方角色與能力並確認。',
    selector: TUTORIAL_DIALOG_SELECTOR,
    transitions: [
      transition('mashiro-skill', (event) => event.type === 'cardResolved' && event.cardId === 'guide' && event.success),
      transition('card-guide', (event) => event.type === 'cardResolved' && event.cardId === 'guide' && !event.success),
      transition('card-guide', (event) => event.type === 'cardDialogClosed'),
    ],
  },
  'mashiro-skill': {
    title: '10. 操作兩顆骰',
    purpose: '學習較複雜的主動技能可以同時讀取來源骰與修改目標骰。',
    function: '真白的「融會貫通」需要指定另一名隊友的待分配骰作為來源，再指定真白自己的骰作為目標。',
    instruction: '關閉說明後，發動真白的「融會貫通」。',
    selector: '[data-tutorial="skill-mashiroSynthesis"]',
    transitions: [transition('mashiro-target', (event) => event.type === 'skillDialogOpened' && event.memberId === 'mashiro' && event.skillId === 'mashiroSynthesis')],
  },
  'mashiro-target': {
    title: '11. 選擇來源與目標骰',
    purpose: '理解雙目標技能中「來源」與「被修改目標」是兩個不同角色。',
    function: '先選擇隊友提供的來源骰，再選擇真白自己的目標骰；確認後技能會依這兩顆骰執行效果。',
    instruction: '關閉說明後，在技能視窗完成來源骰與目標骰的指定並確認。',
    selector: TUTORIAL_DIALOG_SELECTOR,
    transitions: [
      transition('triangle-skill', (event) => event.type === 'skillResolved' && event.memberId === 'mashiro' && event.skillId === 'mashiroSynthesis' && event.success),
      transition('mashiro-skill', (event) => event.type === 'skillResolved' && event.memberId === 'mashiro' && event.skillId === 'mashiroSynthesis' && !event.success),
      transition('mashiro-skill', (event) => event.type === 'skillDialogClosed'),
    ],
  },
  'triangle-skill': {
    title: '12. 依 Tag 指定角色',
    purpose: '學習有些技能不是依隊伍，而是依角色 Tag 判斷合法目標。',
    function: '三角希的「滾滾三角生物」會尋找帶有「三角生物」Tag 的角色；敵方八代也符合，因此可以跨隊伍指定。',
    instruction: '關閉說明後，發動三角希的「滾滾三角生物」。',
    selector: '[data-tutorial="skill-triangleRecovery"]',
    transitions: [transition('triangle-target', (event) => event.type === 'skillDialogOpened' && event.memberId === 'triangle' && event.skillId === 'triangleRecovery')],
  },
  'triangle-target': {
    title: '13. 選擇 Tag 目標',
    purpose: '確認技能可選目標是由條件篩選，而不是固定只能選我方角色。',
    function: '此技能只列出具有「三角生物」Tag 的合法角色；八代是本次教學安排的跨隊伍目標。',
    instruction: '關閉說明後，在技能視窗選擇八代並確認。',
    selector: TUTORIAL_DIALOG_SELECTOR,
    transitions: [
      transition('end-turn', (event) => event.type === 'skillResolved' && event.memberId === 'triangle' && event.skillId === 'triangleRecovery' && event.success),
      transition('triangle-skill', (event) => event.type === 'skillResolved' && event.memberId === 'triangle' && event.skillId === 'triangleRecovery' && !event.success),
      transition('triangle-skill', (event) => event.type === 'skillDialogClosed'),
    ],
  },
  'end-turn': {
    title: '14. 結束回合',
    purpose: '了解完成骰子與卡牌操作後，如何把控制權交給對手並進入下一回合。',
    function: '「結束回合」會放棄仍未分配的骰子，接著由對手自動行動，最後開始新的回合。',
    instruction: '關閉說明後，按下「結束回合」。',
    selector: '[data-tutorial="end-turn"]',
    transitions: [transition('complete', (event) => event.type === 'playerAssignmentFinished')],
  },
  complete: {
    title: '教學完成',
    purpose: '你已完成一輪包含角色行動、骰子、作品、手牌與多種技能目標形式的基本操作。',
    function: '接下來不再限制操作，你可以繼續自由遊玩這場固定教學對局，或回到主畫面開始一般遊戲。',
    instruction: '按下「開始自由操作」或右上角 X 結束教學引導。',
    transitions: [transition(null, (event) => event.type === 'dismissed')],
  },
};

export function createTutorialRuntimeState(): TutorialRuntimeState {
  return { step: 'grimm-slack', randomIndex: 0 };
}

export function reduceTutorialEvent(state: TutorialRuntimeState, event: TutorialEvent): TutorialRuntimeState {
  if (!state.step) return state;
  const next = TUTORIAL_SCENARIO[state.step].transitions.find((candidate) => candidate.matches(event))?.next;
  if (next === undefined) return state;
  return { ...state, step: next };
}
