import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import { useOnlineSession } from '../online/onlineSession';

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
  const offerCode = useOnlineSession((state) => state.offerCode);
  const answerCode = useOnlineSession((state) => state.answerCode);
  const error = useOnlineSession((state) => state.error);
  const createHostOffer = useOnlineSession((state) => state.createHostOffer);
  const createGuestAnswer = useOnlineSession((state) => state.createGuestAnswer);
  const acceptHostAnswer = useOnlineSession((state) => state.acceptHostAnswer);
  const disconnect = useOnlineSession((state) => state.disconnect);
  const clearError = useOnlineSession((state) => state.clearError);
  const [remoteOffer, setRemoteOffer] = useState('');
  const [remoteAnswer, setRemoteAnswer] = useState('');

  const connected = status === 'connected';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 950 }}>連線對戰 · WebRTC P2P</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: .5 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.7 }}>
            不需要遊戲 Server。Host 與 Guest 透過連線碼交換 WebRTC 資訊；連線後仍使用原本的遊玩畫面。
          </Typography>

          {error && <Alert severity="error" onClose={clearError}>{error}</Alert>}
          {connected && (
            <Alert severity="success">
              已連線。{role === 'host' ? '請關閉此視窗後開始遊戲並選擇隊伍。' : '等待 Host 建立對局；收到資料後會自動進入遊戲。'}
            </Alert>
          )}

          {!role && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" fullWidth startIcon={<LinkRoundedIcon />} onClick={() => void createHostOffer()}>
                我是 Host
              </Button>
              <Button variant="outlined" fullWidth onClick={() => useOnlineSession.setState({ role: 'guest', status: 'idle', error: null })}>
                我是 Guest
              </Button>
            </Stack>
          )}

          {role === 'host' && (
            <Stack spacing={1.2}>
              <Typography sx={{ fontWeight: 900 }}>1. 將 Offer Code 傳給 Guest</Typography>
              {!offerCode && (
                <Button variant="contained" disabled={status === 'preparing'} onClick={() => void createHostOffer()}>
                  {status === 'preparing' ? '建立中…' : '建立 Offer Code'}
                </Button>
              )}
              {offerCode && (
                <>
                  <TextField value={offerCode} multiline minRows={3} fullWidth slotProps={{ input: { readOnly: true } }} />
                  <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => void copyText(offerCode)}>複製 Offer Code</Button>
                </>
              )}
              <Divider />
              <Typography sx={{ fontWeight: 900 }}>2. 貼上 Guest 回傳的 Answer Code</Typography>
              <TextField
                value={remoteAnswer}
                onChange={(event) => setRemoteAnswer(event.target.value)}
                multiline
                minRows={3}
                fullWidth
                placeholder="貼上 Answer Code"
              />
              <Button variant="contained" disabled={!remoteAnswer.trim() || connected} onClick={() => void acceptHostAnswer(remoteAnswer)}>
                套用 Answer 並連線
              </Button>
            </Stack>
          )}

          {role === 'guest' && (
            <Stack spacing={1.2}>
              <Typography sx={{ fontWeight: 900 }}>1. 貼上 Host 的 Offer Code</Typography>
              <TextField
                value={remoteOffer}
                onChange={(event) => setRemoteOffer(event.target.value)}
                multiline
                minRows={3}
                fullWidth
                placeholder="貼上 Offer Code"
              />
              <Button
                variant="contained"
                disabled={!remoteOffer.trim() || status === 'preparing' || !!answerCode}
                onClick={() => void createGuestAnswer(remoteOffer)}
              >
                產生 Answer Code
              </Button>
              {answerCode && (
                <>
                  <Divider />
                  <Typography sx={{ fontWeight: 900 }}>2. 將 Answer Code 傳回 Host</Typography>
                  <TextField value={answerCode} multiline minRows={3} fullWidth slotProps={{ input: { readOnly: true } }} />
                  <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => void copyText(answerCode)}>複製 Answer Code</Button>
                  {!connected && <Alert severity="info">等待 Host 套用 Answer Code。</Alert>}
                </>
              )}
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
