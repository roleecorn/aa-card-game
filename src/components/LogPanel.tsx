import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Collapse, List, ListItem, ListItemText, Paper, Stack, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import type { LogEntry } from '../game/types';

const bottomThreshold = 24;

export function LogPanel({ logs }: { logs: LogEntry[] }) {
  const [open, setOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    stickToBottomRef.current = true;
    scrollToBottom();
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (!open || !stickToBottomRef.current) return;
    scrollToBottom();
  }, [logs.length, open, scrollToBottom]);

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;
      if (next) stickToBottomRef.current = true;
      return next;
    });
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 20 },
        bottom: { xs: 12, md: 20 },
        zIndex: 1000,
        width: { xs: 'calc(100vw - 24px)', sm: 400 },
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'none',
      }}
    >
      <Collapse in={open} unmountOnExit>
        <Paper
          variant="outlined"
          sx={{
            mb: .8,
            p: 1.1,
            borderWidth: 1.5,
            boxShadow: '0 10px 30px rgba(30,48,75,.16)',
            bgcolor: 'rgba(255,255,255,.98)',
            pointerEvents: 'auto',
          }}
        >
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ px: .3, pb: .55 }}>
            <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>遊戲紀錄</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              {logs.length} entries · newest below
            </Typography>
          </Stack>

          <Box
            ref={scrollContainerRef}
            onScroll={(event) => {
              const container = event.currentTarget;
              const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
              stickToBottomRef.current = distanceFromBottom <= bottomThreshold;
            }}
            sx={{
              maxHeight: { xs: 280, md: 340 },
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              borderTop: '1px solid #e2e9f2',
              pt: .45,
              pr: .35,
            }}
          >
            {logs.length === 0 ? (
              <Typography sx={{ py: 1.5, px: .6, fontSize: 13, color: 'text.secondary' }}>尚無遊戲紀錄</Typography>
            ) : (
              <List dense disablePadding>
                {logs.map((log) => (
                  <ListItem key={log.id} disableGutters sx={{ py: .25, px: .45 }}>
                    <ListItemText
                      primary={log.text}
                      secondary={`Round ${log.round}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Paper>
      </Collapse>

      <Stack alignItems="flex-end" sx={{ pointerEvents: 'auto' }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<HistoryIcon />}
          endIcon={open ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          aria-expanded={open}
          aria-controls="game-log-panel"
          onClick={toggleOpen}
          sx={{ minWidth: 92, boxShadow: '0 5px 16px rgba(30,48,75,.18)' }}
        >
          Log
        </Button>
      </Stack>
    </Box>
  );
}
