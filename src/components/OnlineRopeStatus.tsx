import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { ropeIsWarning, ropeRemainingMs, ropeRemainingSeconds } from '../online/onlineRope';
import { useOnlineSession } from '../online/onlineSession';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function OnlineRopeStatus() {
  const role = useOnlineSession((state) => state.role);
  const timer = useOnlineSession((state) => state.timer);
  const localTeamName = useOnlineSession((state) => state.localTeamName);
  const remoteTeamName = useOnlineSession((state) => state.remoteTeamName);
  const timeoutNotice = useOnlineSession((state) => state.timeoutNotice);
  const clearTimeoutNotice = useOnlineSession((state) => state.clearTimeoutNotice);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [timer?.id, timer?.deadlineAt]);

  useEffect(() => {
    if (role !== 'host' || timer?.kind !== 'battle') return;

    // The Online session remains authoritative for timeout resolution. This capture
    // guard only closes the narrow UI race where a background-throttled timeout
    // callback and the first user input after returning to the tab are both queued.
    const blockExpiredInteraction = (event: Event) => {
      const current = useOnlineSession.getState().timer;
      if (current?.kind !== 'battle' || current.deadlineAt > Date.now()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener('pointerdown', blockExpiredInteraction, true);
    document.addEventListener('click', blockExpiredInteraction, true);
    document.addEventListener('keydown', blockExpiredInteraction, true);
    return () => {
      document.removeEventListener('pointerdown', blockExpiredInteraction, true);
      document.removeEventListener('click', blockExpiredInteraction, true);
      document.removeEventListener('keydown', blockExpiredInteraction, true);
    };
  }, [role, timer?.id, timer?.kind]);

  const remainingMs = timer ? ropeRemainingMs(timer, now) : 0;
  const remainingSeconds = timer ? ropeRemainingSeconds(timer, now) : 0;
  const warning = timer ? ropeIsWarning(timer, now) : false;
  const progress = timer ? Math.max(0, Math.min(100, remainingMs / timer.durationMs * 100)) : 0;
  const actorName = timer
    ? timer.side === role
      ? localTeamName
      : remoteTeamName ?? '對手隊伍'
    : '';
  const phaseLabel = timer?.kind === 'draft'
    ? '選角'
    : timer?.phase?.endsWith('-plan')
      ? '行動規劃'
      : '骰子配置';

  if (!timer && !timeoutNotice) return null;

  return (
    <>
      {timer && (
        <Paper
          variant="outlined"
          aria-live={warning ? 'assertive' : 'off'}
          sx={{
            width: 188,
            minHeight: 58,
            px: 1.25,
            py: .75,
            borderWidth: 2,
            borderColor: warning ? '#e5484d' : '#d4deec',
            bgcolor: warning ? '#fff1f0' : '#fff',
            boxShadow: warning ? '0 0 0 4px rgba(229,72,77,.12)' : 'none',
            overflow: 'hidden',
            animation: warning ? 'ropePulse 700ms ease-in-out infinite' : 'none',
            '@keyframes ropePulse': {
              '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 3px rgba(229,72,77,.10)' },
              '50%': { transform: 'scale(1.035)', boxShadow: '0 0 0 7px rgba(229,72,77,.18)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={.8}>
            <TimerOutlinedIcon sx={{ fontSize: 20, color: warning ? '#c62f35' : '#58709a' }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                title={actorName}
                sx={{
                  fontSize: 10.5,
                  lineHeight: 1.1,
                  fontWeight: 850,
                  color: warning ? '#9f252a' : '#58709a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {actorName} · {phaseLabel}
              </Typography>
              <Typography
                sx={{
                  mt: .2,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: warning ? 22 : 18,
                  lineHeight: 1,
                  fontWeight: 950,
                  color: warning ? '#c62f35' : '#17243d',
                  transition: 'font-size 120ms ease, color 120ms ease',
                }}
              >
                {formatTime(remainingSeconds)}
              </Typography>
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={warning ? 'error' : 'primary'}
            sx={{ mt: .65, height: 4, borderRadius: 999 }}
          />
        </Paper>
      )}

      <Snackbar
        open={!!timeoutNotice}
        autoHideDuration={1800}
        onClose={clearTimeoutNotice}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" variant="filled" onClose={clearTimeoutNotice} sx={{ minWidth: 280 }}>
          <Typography sx={{ fontWeight: 950, lineHeight: 1.2 }}>{timeoutNotice?.title}</Typography>
          <Typography sx={{ fontSize: 13, mt: .25 }}>{timeoutNotice?.message}</Typography>
        </Alert>
      </Snackbar>
    </>
  );
}
