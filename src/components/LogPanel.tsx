import { List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import type { LogEntry } from '../game/types';

export function LogPanel({ logs }: { logs: LogEntry[] }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 260, overflow: 'auto' }}>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>遊戲紀錄</Typography>
      <List dense disablePadding>
        {[...logs].reverse().slice(0, 24).map((log) => (
          <ListItem key={log.id} disableGutters sx={{ py: 0.25 }}>
            <ListItemText
              primary={log.text}
              secondary={`Round ${log.round}`}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
