import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, LinearProgress, Stack, Typography, useMediaQuery } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { ActionFeedback as Feedback, FeedbackImpact } from '../game/actionFeedback';
import { resolvePublicAssetPath } from '../content/publicAssetPath';
import { useGameStore } from '../store/gameStore';

const PRESENTATION_MS = 2600;
const tones = {
  positive: { color: '#5fe1bd', label: '＋ 增益', background: 'rgba(9, 71, 60, .72)' },
  negative: { color: '#ff6f91', label: '− 減益', background: 'rgba(91, 17, 39, .72)' },
  neutral: { color: '#8fb6ff', label: '↔ 變化', background: 'rgba(31, 51, 92, .72)' },
};

const EMPTY: Feedback[] = [];

interface Beat {
  event: Feedback;
  impacts: FeedbackImpact[];
  page: number;
  pages: number;
}

function beats(event: Feedback): Beat[] {
  const pages = Math.max(1, Math.ceil(event.impacts.length / 3));
  return Array.from({ length: pages }, (_, page) => ({
    event,
    impacts: event.impacts.slice(page * 3, page * 3 + 3),
    page,
    pages,
  }));
}

function Impact({ impact }: { impact: FeedbackImpact }) {
  const tone = tones[impact.tone];
  return (
    <Box
      sx={{
        borderLeft: `4px solid ${tone.color}`,
        bgcolor: tone.background,
        backdropFilter: 'blur(8px)',
        px: { xs: 1.1, md: 1.5 },
        py: { xs: .65, md: .8 },
        borderRadius: .7,
        boxShadow: '0 7px 24px rgba(0,0,0,.18)',
      }}
    >
      <Typography sx={{ fontSize: { xs: 12, md: 14 }, color: '#fff', fontWeight: 900, overflowWrap: 'anywhere' }}>
        <Box component="span" sx={{ color: tone.color }}>{tone.label}</Box>
        {' · '}{impact.target} · {impact.part}　{impact.before} → {impact.after}
      </Typography>
    </Box>
  );
}

/** Full-screen presentation gate. Game rules may already be settled, but input never reaches the game while this is visible. */
export function ActionFeedback({ events = EMPTY }: { events?: Feedback[] }) {
  const [queue, setQueue] = useState<Beat[]>([]);
  const seen = useRef(0);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const current = queue[0];
  const actor = useGameStore(state => current ? state.gameDefinition.content.characters[current.event.actorId] : undefined);
  const portrait = resolvePublicAssetPath(actor?.portrait ?? actor?.compactPortrait);

  const skipCurrent = useCallback(() => {
    setQueue(previous => previous.slice(1));
  }, []);

  useEffect(() => {
    const fresh = events.filter(event => event.id > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map(event => event.id));
    setQueue(previous => [...previous, ...fresh.flatMap(beats)]);
  }, [events]);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(skipCurrent, PRESENTATION_MS);
    return () => window.clearTimeout(timer);
  }, [current, skipCurrent]);

  useEffect(() => {
    if (!current) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const blockKeyboard = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', blockKeyboard, true);
    window.addEventListener('keyup', blockKeyboard, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeyboard, true);
      window.removeEventListener('keyup', blockKeyboard, true);
    };
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const animations: Animation[] = [];
    const nodes = document.querySelectorAll<HTMLElement>('[data-feedback-anchor]');
    const anchors = new Set([...nodes].map(node => node.dataset.feedbackAnchor));
    for (const node of nodes) {
      const anchor = node.dataset.feedbackAnchor;
      const impact = current.impacts.find(item => item.anchor === anchor || (!anchors.has(item.anchor) && item.fallbackAnchor === anchor));
      const source = anchor === `member:${current.event.actorId}`;
      if (!impact && !source) continue;
      const color = impact ? tones[impact.tone].color : '#ffd66f';
      animations.push(node.animate([
        { outline: `3px solid ${color}`, outlineOffset: '3px', filter: 'brightness(1)' },
        { outline: `4px solid ${color}`, outlineOffset: reducedMotion ? '3px' : '8px', filter: reducedMotion ? 'brightness(1)' : 'brightness(1.16)' },
        { outline: `3px solid ${color}`, outlineOffset: '3px', filter: 'brightness(1)' },
      ], { duration: reducedMotion ? PRESENTATION_MS : 650, iterations: reducedMotion ? 1 : 4 }));
    }
    return () => animations.forEach(animation => animation.cancel());
  }, [current, reducedMotion]);

  if (!current) return null;

  const title = current.event.kind === 'card' ? '使用卡牌' : '發動技能';
  const side = current.event.teamId === 'player' ? '我方' : '對手';

  return (
    <Box
      data-testid="action-feedback"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.event.actor}${title}${current.event.name}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        skipCurrent();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1600,
        overflow: 'hidden',
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        bgcolor: 'rgba(8, 15, 29, .46)',
        backdropFilter: 'brightness(.72) saturate(.9)',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: '-12% -8%',
          background: 'linear-gradient(110deg, transparent 0 22%, rgba(35,76,132,.2) 33%, rgba(255,255,255,.12) 48%, rgba(178,42,83,.22) 62%, transparent 78%)',
          transform: 'skewX(-10deg)',
          animation: reducedMotion ? 'none' : 'presentation-sweep 900ms ease-out both',
        },
        '@keyframes presentation-sweep': {
          from: { opacity: 0, transform: 'translateX(-12%) skewX(-10deg)' },
          to: { opacity: 1, transform: 'translateX(0) skewX(-10deg)' },
        },
        '@keyframes portrait-in': {
          from: { opacity: 0, transform: 'translateX(-9vw) scale(.96)' },
          to: { opacity: 1, transform: 'translateX(0) scale(1)' },
        },
        '@keyframes title-in': {
          from: { opacity: 0, transform: 'translateX(8vw)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 24% 48%, rgba(255,214,111,.18), transparent 30%), radial-gradient(circle at 78% 36%, rgba(103,154,255,.18), transparent 34%)',
          pointerEvents: 'none',
        }}
      />

      {portrait && (
        <Box
          component="img"
          src={portrait}
          alt=""
          sx={{
            position: 'absolute',
            left: { xs: '-14vw', sm: '-3vw', md: '3vw' },
            bottom: { xs: '-9vh', md: '-14vh' },
            width: { xs: '74vw', sm: '54vw', md: '40vw' },
            maxWidth: 620,
            maxHeight: '106vh',
            objectFit: 'contain',
            objectPosition: 'center bottom',
            filter: 'drop-shadow(20px 12px 26px rgba(0,0,0,.42))',
            animation: reducedMotion ? 'none' : 'portrait-in 360ms cubic-bezier(.2,.8,.2,1) both',
            pointerEvents: 'none',
          }}
        />
      )}

      <Stack
        spacing={1.2}
        sx={{
          position: 'absolute',
          right: { xs: 14, sm: '5vw', md: '7vw' },
          top: { xs: '14vh', sm: '18vh', md: '22vh' },
          width: { xs: '62vw', sm: '53vw', md: '49vw' },
          maxWidth: 760,
          alignItems: 'flex-start',
          animation: reducedMotion ? 'none' : 'title-in 320ms 70ms ease-out both',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeIcon sx={{ color: '#ffd66f', fontSize: { xs: 22, md: 30 } }} />
          <Typography sx={{ color: '#d7e4ff', fontWeight: 900, letterSpacing: '.16em', fontSize: { xs: 11, md: 14 } }}>
            {side} · ROUND {current.event.round}{current.pages > 1 ? ` · ${current.page + 1}/${current.pages}` : ''}
          </Typography>
        </Stack>

        <Typography sx={{ color: '#fff', fontWeight: 950, lineHeight: .94, textShadow: '0 4px 18px rgba(0,0,0,.45)', fontSize: { xs: 25, sm: 38, md: 58 } }}>
          {current.event.actor}
        </Typography>
        <Typography sx={{ color: '#ffd66f', fontWeight: 950, lineHeight: 1.04, textShadow: '0 4px 18px rgba(0,0,0,.5)', fontSize: { xs: 20, sm: 31, md: 46 } }}>
          {title}「{current.event.name}」{current.event.incomplete ? '（未完整結算）' : ''}
        </Typography>

        <Stack spacing={.65} sx={{ width: '100%', maxWidth: 680, mt: 1 }}>
          {current.impacts.map((impact, index) => <Impact key={index} impact={impact} />)}
          {!current.impacts.length && (
            <Box sx={{ bgcolor: 'rgba(20,31,53,.72)', px: 1.5, py: .9, borderRadius: .7 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: { xs: 12, md: 14 } }}>效果已處理 · 沒有可見數值變化</Typography>
            </Box>
          )}
        </Stack>
      </Stack>

      <Typography
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: { xs: 20, md: 28 },
          textAlign: 'center',
          color: 'rgba(255,255,255,.88)',
          fontSize: { xs: 11, md: 13 },
          fontWeight: 800,
          letterSpacing: '.08em',
          textShadow: '0 2px 8px #000',
          pointerEvents: 'none',
        }}
      >
        點擊畫面跳過動畫
      </Typography>

      {!reducedMotion && (
        <LinearProgress
          variant="determinate"
          value={0}
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 3,
            bgcolor: 'rgba(255,255,255,.16)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#ffd66f',
              animation: `feedback-time ${PRESENTATION_MS}ms linear`,
              '@keyframes feedback-time': {
                from: { transform: 'translateX(0)' },
                to: { transform: 'translateX(-100%)' },
              },
            },
          }}
        />
      )}
    </Box>
  );
}
