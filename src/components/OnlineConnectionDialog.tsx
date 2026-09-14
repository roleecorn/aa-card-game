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
      <DialogTitle sx={{ fontWeight: 950 }}>連線對戰 · WebRTC P2P</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: .5 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.7 }}>
            房主先選擇 3 人或 5 人模式，再建立 6 位數房間代碼。配對完成後雙方會直接進入公平角色 Draft，不再使用單方重抽。
          </Typography>

          {error && <Alert severity="error" onClose={clearError}>{error}</Alert>}
          {connected && (
            <Alert severity="success">
              已連線。{role === 'host' ? `已建立 ${teamSize} 人模式，準備進入角色 Draft。` : '等待房主同步角色 Draft。'}
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
              <Typography sx={{ fontWeight: 950, textAlign: 'center' }}>先選擇對戰模式</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, textAlign: 'center' }}>
                3 人模式會公開 6 張候選角色；5 人模式會公開 10 張候選角色。
              </Typography>
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
              {status === 'preparing' && <Alert severity="info">正在連接 signaling broker…</Alert>}
              {status === 'waiting' && <Alert severity="info">等待 Guest 輸入房間代碼。</Alert>}
              {status === 'connecting' && <Alert severity="info">已找到 Guest，正在建立 P2P 連線…</Alert>}
            </Stack>
          )}

          {role === 'guest' && !connected && (
            <Stack spacing={1.2}>
              <Typography sx={{ fontWeight: 900 }}>輸入 Host 的 6 位數房間代碼</Typography>
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
              {status === 'waiting' && <Alert severity="info">已送出加入要求，等待 Host 回應。</Alert>}
              {status === 'connecting' && <Alert severity="info">已找到 Host，正在建立 P2P 連線…</Alert>}
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
