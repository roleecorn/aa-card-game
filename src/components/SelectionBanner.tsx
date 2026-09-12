import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Paper, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  instruction: string;
  onCancel: () => void;
}

export function SelectionBanner({ title, instruction, onCancel }: Props) {
  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        zIndex: 1260,
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(620px, calc(100vw - 24px))',
        px: 1.5,
        py: 1,
        border: '2px solid',
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 950, fontSize: 15 }}>{title}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>{instruction}</Typography>
        </Stack>
        <IconButton aria-label="取消選擇" onClick={onCancel} size="small">
          <CloseIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
