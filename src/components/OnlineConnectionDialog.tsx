import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import { useOnlineSession } from '../online/onlineSession';
import type { OnlineTeamSize } from '../online/onlineDraft';

interface Props {
  open: boolean;
  onClose: () => void;
}

async function copyText(text: string): Promise<void> {
  if (text) await navigator.clipboard.writeText(text);
}

export function OnlineConnectionDialog({ open, onClose }: Props) {
  const role = useOnlineSession((state) => state.role);
  const status = useOnlineSession((state) => state.status);
  const roomCode = useOnlineSession((state) => state.roomCode);
  const teamSize = useOnlineSession((state) => state.teamSize);
  const error = useOnlineSession((state) => state.error);
  const createHostRoom = useOnlineSession((state) => state.createHostRoom);
  const joinGuestRoom = useOnlineSession((state) => state.joinGuestRoom);
  const disconnect = useOnlineSession((state) => state.disconnect);
  const clearError = useOnlineSession((state) => state.clearError);
  const [guestCode, setGuestCode] = useState('');
  const [choosingHostMode, setChoosingHostMode] = useState(false);

  const connected = status === 'connected';
  const waiting = status === 'waiting' || status === 'connecting';
  const createRoom = (size: OnlineTeamSize) => {
    setChoosingHostMode(false);
    void createHostRoom(size);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 950 }}>連線對戰</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: .5 }}>
          {error && <Alert severity="error" onClose={clearError}>{error}</Alert>}
          {connected && (
            <Alert severity="success">
              已連線。{role === 'host' ? `已建立 ${teamSize} 人模式，準備進入角色選擇。` : '已加入房間，等待房主開始角色選擇。'}
            </Alert>
          )}

          {!role && !choosingHostMode && (
            <Stack spacing={1}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<LinkRoundedIcon />}
                onClick={() => setChoosingHostMode(true)}
              >
                建立連線房間
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => useOnlineSession.setState({ role: 'guest', status: 'idle', error: null })}
              >
                加入連線房間
              </Button>
            </Stack>
          )}

          {!role && choosingHostMode && (
            <Stack spacing={1.2}>
              <Button variant="outlined" size="large" onClick={() => createRoom(3)} sx={{ fontWeight: 950 }}>
                3 人模式
              </Button>
              <Button variant="contained" size="large" onClick={() => createRoom(5)} sx={{ fontWeight: 950 }}>
                5 人模式
              </Button>
              <Button variant="text" onClick={() => setChoosingHostMode(false)}>返回</Button>
            </Stack>
          )}

          {role === 'host' && (
            <Stack spacing={1.2} alignItems="stretch">
              <Typography sx={{ fontWeight: 900, textAlign: 'center' }}>{teamSize} 人模式 · 房間代碼</Typography>
              <Typography
                aria-label="6 位數房間代碼"
                sx={{
                  py: 1.2,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: { xs: 38, sm: 44 },
                  fontWeight: 950,
                  letterSpacing: '.18em',
                  lineHeight: 1,
                }}
              >
                {roomCode || '------'}
              </Typography>
              {!!roomCode && (
                <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => void copyText(roomCode)}>
                  複製房間代碼
                </Button>
              )}
              {status === 'preparing' && <Alert severity="info">正在建立房間…</Alert>}
              {status === 'waiting' && <Alert severity="info">等待另一位玩家加入。</Alert>}
              {status === 'connecting' && <Alert severity="info">已找到對手，正在連線…</Alert>}
            </Stack>
          )}

          {role === 'guest' && !connected && (
            <Stack spacing={1.2}>
              <Typography sx={{ fontWeight: 900 }}>輸入房主的 6 位數房間代碼</Typography>
              <TextField
                value={guestCode}
                onChange={(event) => setGuestCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                fullWidth
                autoFocus
                placeholder="000000"
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6, pattern: '[0-9]*' } }}
              />
              <Button
                variant="contained"
                disabled={guestCode.length !== 6 || status === 'preparing' || waiting}
                onClick={() => void joinGuestRoom(guestCode)}
              >
                {status === 'preparing' ? '連接中…' : waiting ? '正在配對…' : '加入房間'}
              </Button>
              {status === 'waiting' && <Alert severity="info">正在尋找房間…</Alert>}
              {status === 'connecting' && <Alert severity="info">已找到房間，正在連線…</Alert>}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {role && <Button color="warning" onClick={disconnect}>中斷連線</Button>}
        <Button onClick={onClose}>{connected ? '完成' : '關閉'}</Button>
      </DialogActions>
    </Dialog>
  );
}
