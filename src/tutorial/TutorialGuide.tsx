import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import {
  TUTORIAL_DIALOG_SELECTOR,
  TUTORIAL_SCENARIO,
  type TutorialStepId,
} from './scenario';

const DIALOG_PORTAL_INTERACTIVE_SELECTOR = '[role="listbox"], [role="option"], [role="menu"], [role="menuitem"]';

export function TutorialGuide({ step, onDismiss }: { step: TutorialStepId; onDismiss: () => void }) {
  const definition = TUTORIAL_SCENARIO[step];
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
    if (element && definition.selector !== TUTORIAL_DIALOG_SELECTOR) {
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
      if (definition.selector === TUTORIAL_DIALOG_SELECTOR && target.closest(DIALOG_PORTAL_INTERACTIVE_SELECTOR)) return;
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
