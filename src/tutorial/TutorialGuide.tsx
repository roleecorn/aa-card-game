import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import type { TutorialStepId } from '../content/tutorial';

interface StepDefinition {
  title: string;
  purpose: string;
  function: string;
  instruction: string;
  selector?: string;
}

const DIALOG_SELECTOR = '[role="dialog"]';
const DIALOG_PORTAL_INTERACTIVE_SELECTOR = '[role="listbox"], [role="option"], [role="menu"], [role="menuitem"]';

const STEPS: Record<TutorialStepId, StepDefinition> = {
  'grimm-slack': {
    title: '1. 選擇角色行動',
    purpose: '了解每名角色在回合開始時都能獨立決定要創作還是摸魚。',
    function: '「摸魚」會讓角色本回合不產生創作骰，適合在壓力或局勢不利時暫停行動。',
    instruction: '關閉說明後，請把格林改成「摸魚」。',
    selector: '[data-tutorial="action-grimm-slack"]',
  },
  'grimm-work': {
    title: '2. 切回創作',
    purpose: '確認角色的行動選擇可以在正式執行前個別調整。',
    function: '「創作」會讓角色依 Design、Text、AA 數值產生本回合可使用的骰子。',
    instruction: '關閉說明後，請把格林切回「創作」。',
    selector: '[data-tutorial="action-grimm-work"]',
  },
  'perform-work': {
    title: '3. 擲出本回合骰子',
    purpose: '把角色的行動選擇正式執行，產生本回合可以分配的創作骰。',
    function: '「進行創作」會一次結算所有角色的行動。教學關卡使用固定骰點，因此每次重玩結果都相同。',
    instruction: '關閉說明後，按下「進行創作」。',
    selector: '[data-tutorial="perform-work"]',
  },
  'grimm-skill': {
    title: '4. 發動指定骰技能',
    purpose: '學習主動技能如何在骰子分配前改變本回合資源。',
    function: '格林的「燃燒畫面」會讓自己壓力 +1，並把一顆尚未分配的 AA 骰 +2；這是一種用壓力交換輸出的技能。',
    instruction: '關閉說明後，發動格林的「燃燒畫面」。',
    selector: '[data-tutorial="skill-grimmBurningFrame"]',
  },
  'grimm-target': {
    title: '5. 在技能視窗選目標',
    purpose: '了解部分主動技能需要指定實際作用的骰子。',
    function: '「燃燒畫面」只能指定格林自己尚未分配的 AA 骰；選定後該骰點數會提高 2。',
    instruction: '關閉說明後，在技能視窗選擇格林自己的 AA 骰並確認。',
    selector: DIALOG_SELECTOR,
  },
  'dice-select': {
    title: '6. 選擇要放置的骰',
    purpose: '學習從本回合骰子中挑選一顆，準備投入作品。',
    function: '作品必須依 Design → Text → AA 的順序完成，因此第一顆要先從 Design 骰開始。',
    instruction: '關閉說明後，選擇一顆真白的 Design 骰。',
    selector: '[data-tutorial="die-mashiro-design"]',
  },
  'work-slot': {
    title: '7. 放進作品',
    purpose: '學習把選中的骰子實際投入作品，推進作品完成度。',
    function: '骰子放入作品後就會占用該格；後續仍需按照 Design → Text → AA 的順序補齊作品需求。',
    instruction: '關閉說明後，把剛才選中的 Design 骰放進真白的作品。',
    selector: '[data-tutorial="work-mashiro"]',
  },
  'card-guide': {
    title: '8. 使用手牌',
    purpose: '了解支援卡可以在回合中提供額外效果，而不只依靠角色技能。',
    function: '「指導」是一張需要指定角色與能力的支援卡。教學中的起手牌與後續抽牌順序都是固定的。',
    instruction: '關閉說明後，點擊手牌中的「指導」。',
    selector: '[data-tutorial="card-guide"]',
  },
  'card-target': {
    title: '9. 指定卡牌目標',
    purpose: '學習需要目標的卡牌如何選擇作用對象。',
    function: '「指導」需要先指定一名我方角色，再指定該角色的一項能力，效果才會成立。',
    instruction: '關閉說明後，在卡牌視窗中選擇一名我方角色與能力並確認。',
    selector: DIALOG_SELECTOR,
  },
  'mashiro-skill': {
    title: '10. 操作兩顆骰',
    purpose: '學習較複雜的主動技能可以同時讀取來源骰與修改目標骰。',
    function: '真白的「融會貫通」需要指定另一名隊友的待分配骰作為來源，再指定真白自己的骰作為目標。',
    instruction: '關閉說明後，發動真白的「融會貫通」。',
    selector: '[data-tutorial="skill-mashiroSynthesis"]',
  },
  'mashiro-target': {
    title: '11. 選擇來源與目標骰',
    purpose: '理解雙目標技能中「來源」與「被修改目標」是兩個不同角色。',
    function: '先選擇隊友提供的來源骰，再選擇真白自己的目標骰；確認後技能會依這兩顆骰執行效果。',
    instruction: '關閉說明後，在技能視窗完成來源骰與目標骰的指定並確認。',
    selector: DIALOG_SELECTOR,
  },
  'triangle-skill': {
    title: '12. 依 Tag 指定角色',
    purpose: '學習有些技能不是依隊伍，而是依角色 Tag 判斷合法目標。',
    function: '三角希的「滾滾三角生物」會尋找帶有「三角生物」Tag 的角色；敵方八代也符合，因此可以跨隊伍指定。',
    instruction: '關閉說明後，發動三角希的「滾滾三角生物」。',
    selector: '[data-tutorial="skill-triangleRecovery"]',
  },
  'triangle-target': {
    title: '13. 選擇 Tag 目標',
    purpose: '確認技能可選目標是由條件篩選，而不是固定只能選我方角色。',
    function: '此技能只列出具有「三角生物」Tag 的合法角色；八代是本次教學安排的跨隊伍目標。',
    instruction: '關閉說明後，在技能視窗選擇八代並確認。',
    selector: DIALOG_SELECTOR,
  },
  'end-turn': {
    title: '14. 結束回合',
    purpose: '了解完成骰子與卡牌操作後，如何把控制權交給對手並進入下一回合。',
    function: '「結束回合」會放棄仍未分配的骰子，接著由對手自動行動，最後開始新的回合。',
    instruction: '關閉說明後，按下「結束回合」。',
    selector: '[data-tutorial="end-turn"]',
  },
  complete: {
    title: '教學完成',
    purpose: '你已完成一輪包含角色行動、骰子、作品、手牌與多種技能目標形式的基本操作。',
    function: '接下來不再限制操作，你可以繼續自由遊玩這場固定教學對局，或回到主畫面開始一般遊戲。',
    instruction: '按下「開始自由操作」或右上角 X 結束教學引導。',
  },
};

export function TutorialGuide({ step, onDismiss }: { step: TutorialStepId; onDismiss: () => void }) {
  const definition = STEPS[step];
  const [rect, setRect] = useState<DOMRect>();
  const [introOpen, setIntroOpen] = useState(true);

  useEffect(() => {
    setIntroOpen(true);
  }, [step]);

  useEffect(() => {
    if (!definition.selector || introOpen) {
      setRect(undefined);
      return;
    }

    const element = document.querySelector<HTMLElement>(definition.selector);
    if (element && definition.selector !== DIALOG_SELECTOR) {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
    const update = () => {
      const target = document.querySelector<HTMLElement>(definition.selector!);
      setRect(target?.getBoundingClientRect());
    };
    update();
    const timer = window.setInterval(update, 250);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [definition.selector, introOpen]);

  useEffect(() => {
    if (!definition.selector || introOpen) return;
    const block = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(definition.selector!)) return;
      if (definition.selector === DIALOG_SELECTOR && target.closest(DIALOG_PORTAL_INTERACTIVE_SELECTOR)) return;
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
    };
    document.addEventListener('pointerdown', block, true);
    document.addEventListener('click', block, true);
    return () => {
      document.removeEventListener('pointerdown', block, true);
      document.removeEventListener('click', block, true);
    };
  }, [definition.selector, introOpen]);

  const closeIntro = () => {
    if (step === 'complete') {
      onDismiss();
      return;
    }
    setIntroOpen(false);
  };

  return (
    <>
      {rect && (
        <Box
          sx={{
            position: 'fixed',
            zIndex: 1390,
            left: Math.max(6, rect.left - 6),
            top: Math.max(6, rect.top - 6),
            width: rect.width + 12,
            height: rect.height + 12,
            border: '4px solid #ffb43b',
            borderRadius: 2,
            boxShadow: '0 0 0 9999px rgba(20, 28, 45, .52), 0 0 0 7px rgba(255,180,59,.26)',
            pointerEvents: 'none',
          }}
        />
      )}

      <Dialog
        open={introOpen}
        onClose={closeIntro}
        maxWidth="sm"
        fullWidth
        aria-labelledby="tutorial-guide-title"
        sx={{ '& .MuiDialog-paper': { border: '3px solid #ffb43b', borderRadius: 3, overflow: 'visible' } }}
      >
        <DialogTitle id="tutorial-guide-title" sx={{ pr: 6, pb: 1, fontSize: 24, fontWeight: 950 }}>
          {definition.title}
          <IconButton aria-label="關閉教學說明" onClick={closeIntro} sx={{ position: 'absolute', right: 10, top: 10 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 950, color: 'primary.main', mb: .45 }}>目的</Typography>
              <Typography sx={{ fontSize: 17, lineHeight: 1.75, fontWeight: 700 }}>{definition.purpose}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 950, color: 'secondary.main', mb: .45 }}>功能說明</Typography>
              <Typography sx={{ fontSize: 16, lineHeight: 1.75, color: 'text.secondary', fontWeight: 650 }}>{definition.function}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff7e6', border: '1.5px solid #ffc65d' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 950, color: '#9a5b00', mb: .35 }}>接下來請操作</Typography>
              <Typography sx={{ fontSize: 16, lineHeight: 1.7, fontWeight: 850 }}>{definition.instruction}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="contained" size="large" onClick={closeIntro} sx={{ px: 3, fontWeight: 900 }}>
            {step === 'complete' ? '開始自由操作' : '確定，開始操作'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}