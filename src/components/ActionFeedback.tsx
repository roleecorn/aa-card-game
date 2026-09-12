import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, LinearProgress, Stack, Typography, useMediaQuery } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { ActionFeedback as Feedback } from '../game/actionFeedback';
import { resolvePublicAssetPath } from '../content/publicAssetPath';
import { useGameStore } from '../store/gameStore';

const PRESENTATION_MS = 2600;
const IMPACT_CONFIRM_MS = 280;
const TARGET_PADDING = 10;
const ACTION_PRESENTATION_Z_INDEX = 2000;
const TARGET_EFFECT_LAYER_Z_INDEX = 1;
const PRESENTATION_CONTENT_Z_INDEX = 2;

const tones = {
  positive: { color: '#5fe1bd', glow: 'rgba(95,225,189,.28)', sweep: 'rgba(66,191,158,.24)' },
  negative: { color: '#ff6f91', glow: 'rgba(255,111,145,.28)', sweep: 'rgba(178,42,83,.28)' },
  neutral: { color: '#8fb6ff', glow: 'rgba(143,182,255,.24)', sweep: 'rgba(35,76,132,.22)' },
  mixed: { color: '#ffd66f', glow: 'rgba(255,214,111,.24)', sweep: 'rgba(151,89,177,.25)' },
} as const;

type PresentationTone = keyof typeof tones;
type TargetEffect = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: PresentationTone;
};

const EMPTY: Feedback[] = [];

function presentationTone(event: Feedback): PresentationTone {
  const hasPositive = event.impacts.some(impact => impact.tone === 'positive');
  const hasNegative = event.impacts.some(impact => impact.tone === 'negative');
  if (hasPositive && hasNegative) return 'mixed';
  if (hasPositive) return 'positive';
  if (hasNegative) return 'negative';
  return 'neutral';
}

function impactTone(tone: Feedback['impacts'][number]['tone']): PresentationTone {
  return tone === 'positive' || tone === 'negative' ? tone : 'neutral';
}

function TargetEffectLayer({ targets, reducedMotion }: { targets: TargetEffect[]; reducedMotion: boolean }) {
  return (
    <Box data-testid="action-feedback-target-effects" sx={{ position: 'fixed', inset: 0, zIndex: TARGET_EFFECT_LAYER_Z_INDEX, pointerEvents: 'none', overflow: 'hidden' }}>
      {targets.map(target => {
        const palette = tones[target.tone];
        const width = target.width + TARGET_PADDING * 2;
        const height = target.height + TARGET_PADDING * 2;
        const corner = Math.min(28, Math.max(14, Math.min(width, height) * .16));
        const stroke = 3;
        const d = [
          `M ${corner} ${stroke / 2} H ${stroke / 2} V ${corner}`,
          `M ${width - corner} ${stroke / 2} H ${width - stroke / 2} V ${corner}`,
          `M ${stroke / 2} ${height - corner} V ${height - stroke / 2} H ${corner}`,
          `M ${width - corner} ${height - stroke / 2} H ${width - stroke / 2} V ${height - corner}`,
        ].join(' ');

        return (
          <Box
            key={target.key}
            component="svg"
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
            sx={{
              position: 'fixed',
              left: target.x - TARGET_PADDING,
              top: target.y - TARGET_PADDING,
              width,
              height,
              overflow: 'visible',
              filter: `drop-shadow(0 0 7px ${palette.color})`,
              transformOrigin: 'center',
              animation: reducedMotion ? 'none' : 'target-lock-in 280ms cubic-bezier(.2,.85,.2,1) both',
              '@keyframes target-lock-in': {
                from: { opacity: 0, transform: 'scale(1.14)' },
                to: { opacity: 1, transform: 'scale(1)' },
              },
            }}
          >
            <path d={d} fill="none" stroke={palette.color} strokeWidth={stroke} strokeLinecap="square" />
            <rect
              x={stroke}
              y={stroke}
              width={Math.max(0, width - stroke * 2)}
              height={Math.max(0, height - stroke * 2)}
              rx="12"
              fill="none"
              stroke={palette.color}
              strokeWidth="1.5"
              strokeDasharray="7 9"
              opacity=".62"
            >
              {!reducedMotion && <animate attributeName="stroke-dashoffset" values="0;-32" dur="1.2s" repeatCount="indefinite" />}
            </rect>
            {!reducedMotion && (
              <rect
                x={width * .12}
                y={height * .12}
                width={width * .76}
                height={height * .76}
                rx="18"
                fill="none"
                stroke={palette.color}
                strokeWidth="3"
                opacity="0"
              >
                <animate attributeName="x" values={`${width * .12};${-width * .08}`} begin={`${(PRESENTATION_MS - IMPACT_CONFIRM_MS) / 1000}s`} dur={`${IMPACT_CONFIRM_MS / 1000}s`} fill="freeze" />
                <animate attributeName="y" values={`${height * .12};${-height * .08}`} begin={`${(PRESENTATION_MS - IMPACT_CONFIRM_MS) / 1000}s`} dur={`${IMPACT_CONFIRM_MS / 1000}s`} fill="freeze" />
                <animate attributeName="width" values={`${width * .76};${width * 1.16}`} begin={`${(PRESENTATION_MS - IMPACT_CONFIRM_MS) / 1000}s`} dur={`${IMPACT_CONFIRM_MS / 1000}s`} fill="freeze" />
                <animate attributeName="height" values={`${height * .76};${height * 1.16}`} begin={`${(PRESENTATION_MS - IMPACT_CONFIRM_MS) / 1000}s`} dur={`${IMPACT_CONFIRM_MS / 1000}s`} fill="freeze" />
                <animate attributeName="opacity" values="0;.95;0" begin={`${(PRESENTATION_MS - IMPACT_CONFIRM_MS) / 1000}s`} dur={`${IMPACT_CONFIRM_MS / 1000}s`} fill="freeze" />
              </rect>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Full-screen presentation gate.
 *
 * One feedback event is always one presentation, regardless of how many detailed impacts
 * were captured by the rules engine. Impacts stay available for target positioning and
 * tone derivation, but presentation timing is never multiplied by impact count.
 */
export function ActionFeedback({ events = EMPTY }: { events?: Feedback[] }) {
  const [queue, setQueue] = useState<Feedback[]>([]);
  const [targets, setTargets] = useState<TargetEffect[]>([]);
  const seen = useRef(0);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const current = queue[0];
  const actor = useGameStore(state => current ? state.gameDefinition.content.characters[current.actorId] : undefined);
  const portrait = resolvePublicAssetPath(actor?.portrait ?? actor?.compactPortrait);

  const skipCurrent = useCallback(() => {
    setQueue(previous => previous.slice(1));
  }, []);

  useEffect(() => {
    const fresh = events.filter(event => event.id > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map(event => event.id));
    setQueue(previous => [...previous, ...fresh]);
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

  useLayoutEffect(() => {
    if (!current) {
      setTargets([]);
      return;
    }

    const updateTargets = () => {
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-feedback-anchor]')];
      const availableAnchors = new Set(nodes.map(node => node.dataset.feedbackAnchor));
      const nextTargets: TargetEffect[] = [];
      const seenNodes = new Set<HTMLElement>();

      for (const impact of current.impacts) {
        const anchor = availableAnchors.has(impact.anchor) ? impact.anchor : impact.fallbackAnchor;
        if (!anchor) continue;
        for (const node of nodes) {
          if (node.dataset.feedbackAnchor !== anchor || seenNodes.has(node)) continue;
          seenNodes.add(node);
          const rect = node.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          nextTargets.push({
            key: `${current.id}:${anchor}:${nextTargets.length}`,
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            tone: impactTone(impact.tone),
          });
        }
      }
      setTargets(nextTargets);
    };

    updateTargets();
    window.addEventListener('resize', updateTargets);
    window.addEventListener('scroll', updateTargets, true);
    return () => {
      window.removeEventListener('resize', updateTargets);
      window.removeEventListener('scroll', updateTargets, true);
    };
  }, [current]);

  if (!current) return null;

  const side = current.teamId === 'player' ? '我方' : '對手';
  const tone = presentationTone(current);
  const palette = tones[tone];
  const presentationKey = String(current.id);
  const actionText = `「${current.name}」`;

  return (
    <Box
      key={presentationKey}
      data-testid="action-feedback"
      data-presentation-key={presentationKey}
      data-presentation-tone={tone}
      role="dialog"
      aria-modal="true"
      aria-label={`${current.actor}${actionText}`}
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
        zIndex: ACTION_PRESENTATION_Z_INDEX,
        isolation: 'isolate',
        overflow: 'hidden',
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        bgcolor: 'rgba(8, 15, 29, .18)',
        backdropFilter: 'brightness(.9) saturate(.98)',
        '&:before': {
          content: '""',
          position: 'absolute',
          zIndex: PRESENTATION_CONTENT_Z_INDEX,
          inset: '-12% -8%',
          background: `linear-gradient(110deg, transparent 0 22%, ${palette.sweep} 33%, rgba(255,255,255,.1) 48%, ${palette.glow} 62%, transparent 78%)`,
          transform: 'skewX(-10deg)',
          animation: reducedMotion ? 'none' : 'presentation-sweep 900ms ease-out both',
          pointerEvents: 'none',
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
      <Box sx={{ position: 'absolute', inset: 0, zIndex: PRESENTATION_CONTENT_Z_INDEX, background: `radial-gradient(circle at 24% 48%, ${palette.glow}, transparent 31%), radial-gradient(circle at 78% 36%, ${palette.sweep}, transparent 35%)`, opacity: .72, pointerEvents: 'none' }} />

      <TargetEffectLayer targets={targets} reducedMotion={reducedMotion} />

      {portrait && (
        <Box component="img" src={portrait} alt="" sx={{ position: 'absolute', zIndex: PRESENTATION_CONTENT_Z_INDEX, left: { xs: '-14vw', sm: '-3vw', md: '3vw' }, bottom: { xs: '-9vh', md: '-14vh' }, width: { xs: '74vw', sm: '54vw', md: '40vw' }, maxWidth: 620, maxHeight: '106vh', objectFit: 'contain', objectPosition: 'center bottom', filter: `drop-shadow(20px 12px 26px rgba(0,0,0,.38)) drop-shadow(0 0 24px ${palette.glow})`, animation: reducedMotion ? 'none' : 'portrait-in 360ms cubic-bezier(.2,.8,.2,1) both', pointerEvents: 'none' }} />
      )}

      <Stack spacing={1.2} sx={{ position: 'absolute', zIndex: PRESENTATION_CONTENT_Z_INDEX, right: { xs: 14, sm: '5vw', md: '7vw' }, top: { xs: '18vh', sm: '24vh', md: '29vh' }, width: { xs: '62vw', sm: '53vw', md: '49vw' }, maxWidth: 760, alignItems: 'flex-start', animation: reducedMotion ? 'none' : 'title-in 320ms 70ms ease-out both' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeIcon sx={{ color: palette.color, fontSize: { xs: 22, md: 30 } }} />
          <Typography sx={{ color: '#eef4ff', fontWeight: 900, letterSpacing: '.16em', fontSize: { xs: 11, md: 14 }, textShadow: '0 2px 8px rgba(0,0,0,.72)' }}>{side} · ROUND {current.round}</Typography>
        </Stack>
        <Typography sx={{ color: '#fff', fontWeight: 950, lineHeight: .94, textShadow: '0 4px 18px rgba(0,0,0,.62)', fontSize: { xs: 25, sm: 38, md: 58 } }}>{current.actor}</Typography>
        <Typography sx={{ color: palette.color, fontWeight: 950, lineHeight: 1.04, textShadow: '0 4px 18px rgba(0,0,0,.68)', fontSize: { xs: 20, sm: 31, md: 46 } }}>{actionText}{current.incomplete ? '（未完整結算）' : ''}</Typography>
      </Stack>

      <Typography sx={{ position: 'absolute', zIndex: PRESENTATION_CONTENT_Z_INDEX, left: 0, right: 0, bottom: { xs: 20, md: 28 }, textAlign: 'center', color: 'rgba(255,255,255,.92)', fontSize: { xs: 11, md: 13 }, fontWeight: 800, letterSpacing: '.08em', textShadow: '0 2px 8px #000', pointerEvents: 'none' }}>點擊畫面跳過動畫</Typography>

      {!reducedMotion && (
        <LinearProgress variant="determinate" value={0} sx={{ position: 'absolute', zIndex: PRESENTATION_CONTENT_Z_INDEX, left: 0, right: 0, bottom: 0, height: 3, bgcolor: 'rgba(255,255,255,.16)', '& .MuiLinearProgress-bar': { bgcolor: palette.color, animation: `feedback-time ${PRESENTATION_MS}ms linear`, '@keyframes feedback-time': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-100%)' } } } }} />
      )}
    </Box>
  );
}
