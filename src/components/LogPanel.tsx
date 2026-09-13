import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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

  const closeDialog = () => setOpen(false);

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          right: { xs: 12, md: 20 },
          bottom: { xs: 12, md: 20 },
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          size="small"
          startIcon={<HistoryIcon />}
          aria-haspopup="dialog"
          aria-controls="game-log-dialog"
          onClick={() => setOpen(true)}
          sx={{ minWidth: 92, boxShadow: '0 5px 16px rgba(30,48,75,.18)' }}
        >
          Log
        </Button>
      </Box>

      <Dialog
        id="game-log-dialog"
        open={open}
        fullWidth
        maxWidth="lg"
        aria-labelledby="game-log-dialog-title"
        onClose={closeDialog}
        PaperProps={{
          sx: {
            height: { xs: '86vh', md: '78vh' },
            maxHeight: 'calc(100vh - 48px)',
            borderRadius: { xs: 1.5, md: 2.5 },
          },
        }}
      >
        <DialogTitle id="game-log-dialog-title" sx={{ py: 1.3, pr: 7 }}>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: 20, fontWeight: 950 }}>遊戲紀錄</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              {logs.length} entries · newest below
            </Typography>
          </Stack>
          <IconButton
            aria-label="關閉遊戲紀錄"
            onClick={closeDialog}
            sx={{ position: 'absolute', right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          ref={scrollContainerRef}
          onScroll={(event) => {
            const container = event.currentTarget;
            const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            stickToBottomRef.current = distanceFromBottom <= bottomThreshold;
          }}
          sx={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            px: { xs: 1.5, md: 2.5 },
            py: 1,
          }}
        >
          {logs.length === 0 ? (
            <Typography sx={{ py: 2, color: 'text.secondary' }}>尚無遊戲紀錄</Typography>
          ) : (
            <List dense disablePadding>
              {logs.map((log) => (
                <ListItem key={log.id} disableGutters sx={{ py: .45 }}>
                  <ListItemText
                    primary={log.text}
                    secondary={`Round ${log.round}`}
                    primaryTypographyProps={{ variant: 'body1' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
