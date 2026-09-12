import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';

interface Props {
  open: boolean;
  title: string;
  description: string;
  hint?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ActivationConfirmDialog({
  open,
  title,
  description,
  hint,
  confirmLabel = '選擇目標',
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ pt: .5 }}>
          <Typography>{description}</Typography>
          {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
