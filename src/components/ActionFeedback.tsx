import { useEffect, useRef, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Avatar, Box, Button, Chip, LinearProgress, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { ActionFeedback as Feedback, FeedbackImpact } from '../game/actionFeedback';
import { resolvePublicAssetPath } from '../content/publicAssetPath';
import { useGameStore } from '../store/gameStore';

const tones = {
  positive: { color: '#087c69', label: '＋ 增益', background: '#e7f7ef' },
  negative: { color: '#ba304f', label: '− 減益', background: '#fff0f3' },
  neutral: { color: '#42619c', label: '↔ 變化', background: '#edf3ff' },
};
const EMPTY: Feedback[] = [];
function ActorPortrait({ event }: { event: Feedback }) {
  const actor = useGameStore(state => state.gameDefinition.content.characters[event.actorId]);
  return <Avatar alt="" src={resolvePublicAssetPath(actor?.compactPortrait ?? actor?.portrait)}
    sx={{ width: 36, height: 36, border: '2px solid #b78824', flexShrink: 0 }}>{event.actor.slice(0, 1)}</Avatar>;
}
interface Beat { event: Feedback; impacts: FeedbackImpact[]; page: number; pages: number }
function beats(event: Feedback): Beat[] {
  const pages = Math.max(1, Math.ceil(event.impacts.length / 3));
  return Array.from({ length: pages }, (_, page) => ({ event, impacts: event.impacts.slice(page * 3, page * 3 + 3), page, pages }));
}
function Impact({ impact }: { impact: FeedbackImpact }) {
  const tone = tones[impact.tone];
  return <Box sx={{ bgcolor: tone.background, borderLeft: `3px solid ${tone.color}`, px: 1, py: .45, borderRadius: .5 }}>
    <Typography sx={{ fontSize: 12, color: tone.color, fontWeight: 800, overflowWrap: 'anywhere' }}>
      {tone.label} · {impact.target} · {impact.part}　{impact.before} → {impact.after}
    </Typography>
  </Box>;
}

/** A presentation clock independent of engine turns and tutorial interaction gates. */
export function ActionFeedback({ events = EMPTY }: { events?: Feedback[] }) {
  const [queue, setQueue] = useState<Beat[]>([]);
  const [paused, setPaused] = useState(false);
  const seen = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const current = queue[0];
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .3 });
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const fresh = events.filter(event => event.id > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map(event => event.id));
    setQueue(previous => [...previous, ...fresh.flatMap(beats)]);
  }, [events]);
  useEffect(() => {
    if (!current || paused) return;
    const timer = window.setTimeout(() => setQueue(previous => previous.slice(1)), 3600);
    return () => window.clearTimeout(timer);
  }, [current, paused]);
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
      const color = impact ? tones[impact.tone].color : '#b78824';
      animations.push(node.animate([
        { outline: `3px solid ${color}`, outlineOffset: '3px', filter: 'brightness(1)' },
        { outline: `3px solid ${color}`, outlineOffset: reducedMotion ? '3px' : '6px', filter: reducedMotion ? 'brightness(1)' : 'brightness(1.08)' },
        { outline: `3px solid ${color}`, outlineOffset: '3px', filter: 'brightness(1)' },
      ], { duration: reducedMotion ? 3600 : 900, iterations: reducedMotion ? 1 : 4 }));
    }
    return () => animations.forEach(animation => animation.cancel());
  }, [current, reducedMotion]);

  return <Paper ref={panel} variant="outlined" data-testid="action-feedback" sx={{ p: 1.25, mb: 1.25, borderColor: '#b8c8df', bgcolor: '#fbfcff', overflow: 'hidden' }}>
    {!inView && current && <Paper aria-hidden="true" data-testid="feedback-floating" sx={{ position: 'fixed', bottom: 12, left: 12, right: 12, maxWidth: 460, ml: 'auto', zIndex: 1200, pointerEvents: 'none', p: 1.25, border: '2px solid #b8c8df', boxShadow: '0 8px 32px #30364533', bgcolor: '#fbfcfff5' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: .7 }}>
      <ActorPortrait event={current.event} />
      <Typography sx={{ fontWeight: 900, fontSize: 14, mb: .5 }}>{current.event.teamId === 'player' ? '我方' : '對手'} {current.event.actor} · {current.event.kind === 'card' ? '卡牌' : '技能'}「{current.event.name}」{current.event.incomplete ? '（未完整結算）' : ''}</Typography>
      </Stack>
      <Stack spacing={.4}>{current.impacts.map((impact, index) => <Impact key={index} impact={impact} />)}</Stack>
      {!current.impacts.length && <Typography variant="caption">已處理 · 沒有可見數值變化</Typography>}
    </Paper>}
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: .65 }}>
      <AutoAwesomeIcon sx={{ color: '#a87b20', fontSize: 20 }} />
      <Typography sx={{ fontSize: 14, fontWeight: 900, flex: 1 }}>戰況提示</Typography>
      {queue.length > 0 && <Button size="small" onClick={() => setPaused(value => !value)}>{paused ? '繼續提示' : '暫停提示'}</Button>}
      {queue.length > 1 && <Button size="small" onClick={() => { setQueue([]); setPaused(false); }}>略過動畫 ({queue.length})</Button>}
    </Stack>
    <Box role="status" aria-live="polite" aria-atomic="true" sx={{ minHeight: { xs: 170, md: 138 } }}>
      {current ? <Box key={`${current.event.id}-${current.page}`} sx={{
        animation: reducedMotion ? 'none' : 'feedback-enter 280ms ease-out',
        '@keyframes feedback-enter': { from: { opacity: 0, transform: 'translateX(-18px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      }}>
        <Stack direction="row" spacing={.7} alignItems="center" sx={{ flexWrap: 'wrap', mb: .65 }}>
          <ActorPortrait event={current.event} />
          <Chip size="small" label={current.event.teamId === 'player' ? '我方' : '對手'} color={current.event.teamId === 'player' ? 'info' : 'warning'} />
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 15, md: 18 } }}>{current.event.actor}　{current.event.kind === 'card' ? '使用卡牌' : '發動技能'}「{current.event.name}」{current.event.incomplete ? '（未完整結算）' : ''}</Typography>
          <Typography variant="caption">第 {current.event.round} 回合{current.pages > 1 ? ` · ${current.page + 1}/${current.pages}` : ''}</Typography>
        </Stack>
        <Stack spacing={.4}>{current.impacts.map((impact, index) => <Impact key={index} impact={impact} />)}</Stack>
        {!current.impacts.length && <Typography variant="body2">效果已處理；沒有可見數值變化（可能無效、被抵擋或數值相同）。</Typography>}
        <Typography sx={{ mt: .6, color: 'text.secondary', fontSize: 11 }}>效果以受影響方判定增減益 · 提示不影響操作{paused ? ' · 提示已暫停' : ''}</Typography>
        {!reducedMotion && !paused && <LinearProgress variant="determinate" value={0} sx={{ mt: .6, height: 2, '& .MuiLinearProgress-bar': { animation: 'feedback-time 3600ms linear', '@keyframes feedback-time': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-100%)' } } } }} />}
      </Box> : <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>等待技能或卡牌發動。施放者會亮起金色外框，受影響部位會依增益、減益或變化標亮。</Typography>}
    </Box>
    {!!events.length && <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 32, px: 0 }}><Typography variant="caption">回看效果 · 最近 {events.length} 次</Typography></AccordionSummary>
      <AccordionDetails sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
        {[...events].reverse().map(event => <Box key={event.id} sx={{ mb: 1.2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12 }}>R{event.round} · {event.teamId === 'player' ? '我方' : '對手'} {event.actor} · {event.name}{event.incomplete ? '（未完整結算）' : ''}</Typography>
          {event.impacts.map((impact, index) => <Impact key={index} impact={impact} />)}
          {!event.impacts.length && <Typography variant="caption">沒有可見數值變化</Typography>}
        </Box>)}
      </AccordionDetails>
    </Accordion>}
  </Paper>;
}
