import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import type { TutorialStepId } from '../content/tutorial';

interface StepDefinition {
  title: string;
  body: string;
  selector?: string;
}

const STEPS: Record<TutorialStepId, StepDefinition> = {
  'grimm-slack': {
    title: '1. 選擇角色行動',
    body: '先把格林改成「摸魚」。教學模式只允許操作目前高亮的控制項。',
    selector: '[data-tutorial="action-grimm-slack"]',
  },
  'grimm-work': {
    title: '2. 切回創作',
    body: '再把格林切回「創作」，確認每名角色都能獨立選擇本回合行動。',
    selector: '[data-tutorial="action-grimm-work"]',
  },
  'perform-work': {
    title: '3. 擲出本回合骰子',
    body: '按「進行創作」。教學關卡的骰子結果固定，因此每次重玩都會得到相同結果。',
    selector: '[data-tutorial="perform-work"]',
  },
  'grimm-skill': {
    title: '4. 發動指定骰技能',
    body: '發動格林的「燃燒畫面」。這會示範需要指定一顆待分配骰的 active skill。',
    selector: '[data-tutorial="skill-grimmBurningFrame"]',
  },
  'grimm-target': {
    title: '5. 在技能視窗選目標',
    body: '在視窗中選擇格林自己的 AA 骰並確認。視窗外的點擊暫時會被阻擋。',
    selector: '[role="dialog"]',
  },
  'dice-select': {
    title: '6. 選擇要放置的骰',
    body: '選一顆真白的 Design 骰。Design 是完成作品格子的第一步。',
    selector: '[data-tutorial="die-mashiro-design"]',
  },
  'work-slot': {
    title: '7. 放進作品',
    body: '把剛選的 Design 骰放進真白作品的任一空格。之後 Text、AA 必須依序補上。',
    selector: '[data-tutorial="work-mashiro"]',
  },
  'card-guide': {
    title: '8. 使用手牌',
    body: '點擊固定起手牌「指導」。教學的起手牌與後續抽牌順序也都是固定的。',
    selector: '[data-tutorial="card-guide"]',
  },
  'card-target': {
    title: '9. 指定卡牌目標',
    body: '在卡牌視窗中選擇一名我方角色與能力後確認，體驗帶目標選擇的支援卡。',
    selector: '[role="dialog"]',
  },
  'mashiro-skill': {
    title: '10. 操作兩顆骰',
    body: '發動真白的「融會貫通」。這個技能需要同時指定來源骰與自己的目標骰。',
    selector: '[data-tutorial="skill-mashiroSynthesis"]',
  },
  'mashiro-target': {
    title: '11. 選擇來源與目標骰',
    body: '在技能視窗完成兩顆骰的指定並確認。',
    selector: '[role="dialog"]',
  },
  'triangle-skill': {
    title: '12. 跨隊伍指定角色',
    body: '發動三角希的「滾滾三角生物」。敵方八代也有「三角生物」Tag，因此可以跨隊伍選擇。',
    selector: '[data-tutorial="skill-triangleRecovery"]',
  },
  'triangle-target': {
    title: '13. 選擇 Tag 目標',
    body: '在技能視窗選擇八代並確認。這示範依角色 Tag 篩選合法目標。',
    selector: '[role="dialog"]',
  },
  'end-turn': {
    title: '14. 結束回合',
    body: '按「結束回合」。未放置的骰會被放棄，之後由對手自動行動並進入下一回合。',
    selector: '[data-tutorial="end-turn"]',
  },
  complete: {
    title: '教學完成',
    body: '你已操作過行動選擇、擲骰、放置、手牌、三種不同 active target 與結束回合。現在可以自由操作這場固定教學對局。',
  },
};

export function TutorialGuide({ step, onDismiss }: { step: TutorialStepId; onDismiss: () => void }) {
  const definition = STEPS[step];
  const [rect, setRect] = useState<DOMRect>();

  useEffect(() => {
    if (!definition.selector) {
      setRect(undefined);
      return;
    }

    const element = document.querySelector<HTMLElement>(definition.selector);
    if (element && definition.selector !== '[role="dialog"]') {
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
  }, [definition.selector]);

  useEffect(() => {
    if (!definition.selector) return;
    const block = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-tutorial-guide]')) return;
      if (target.closest(definition.selector!)) return;
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
  }, [definition.selector]);

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
            border: '3px solid #ffb43b',
            borderRadius: 2,
            boxShadow: '0 0 0 9999px rgba(20, 28, 45, .52), 0 0 0 5px rgba(255,180,59,.22)',
            pointerEvents: 'none',
          }}
        />
      )}
      <Paper
        data-tutorial-guide
        sx={{
          position: 'fixed',
          zIndex: 1400,
          right: { xs: 10, md: 18 },
          bottom: { xs: 10, md: 18 },
          width: 'min(360px, calc(100vw - 20px))',
          p: 1.6,
          border: '2px solid #ffca67',
          boxShadow: '0 12px 36px rgba(30,45,72,.24)',
          bgcolor: '#fffdf7',
        }}
      >
        <Typography sx={{ fontWeight: 950, fontSize: 16 }}>{definition.title}</Typography>
        <Typography sx={{ mt: .6, color: 'text.secondary', fontWeight: 650, lineHeight: 1.65, fontSize: 12.5 }}>
          {definition.body}
        </Typography>
        {step === 'complete' && (
          <Button sx={{ mt: 1 }} variant="contained" onClick={onDismiss}>知道了</Button>
        )}
      </Paper>
    </>
  );
}