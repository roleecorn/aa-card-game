import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';

interface Props {
  onStart: () => void;
  onStartTutorial: () => void;
  onOpenRoster: () => void;
}

export function StartScreen({ onStart, onStartTutorial, onOpenRoster }: Props) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        bgcolor: '#f7f9fd',
        backgroundImage: [
          'radial-gradient(circle at 18% 20%, rgba(255,117,153,.12) 0 4px, transparent 5px)',
          'radial-gradient(circle at 82% 28%, rgba(84,151,232,.11) 0 4px, transparent 5px)',
          'linear-gradient(145deg, rgba(255,255,255,.95), rgba(246,249,255,.96))',
        ].join(','),
        backgroundSize: '90px 90px, 118px 118px, auto',
      }}
    >
      <Paper
        sx={{
          width: 'min(720px, 100%)',
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          border: '1.5px solid #dce6f3',
          boxShadow: '0 18px 60px rgba(54,74,112,.12)',
          bgcolor: 'rgba(255,255,255,.96)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(120deg, transparent 0 56%, rgba(255,124,161,.06) 56% 67%, transparent 67%)' }} />
        <Stack spacing={2.2} alignItems="center" sx={{ position: 'relative' }}>
          <AutoAwesomeRoundedIcon sx={{ fontSize: 42, color: '#f3b843' }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 34, sm: 48 }, fontWeight: 950, letterSpacing: '-.04em', lineHeight: .95 }}>
              AA GROUP
            </Typography>
            <Typography sx={{ mt: .9, fontSize: { xs: 18, sm: 22 }, fontWeight: 850, color: '#62718b' }}>
              創作小隊卡牌遊戲
            </Typography>
          </Box>
          <Typography sx={{ maxWidth: 520, fontSize: 13.5, lineHeight: 1.8, color: 'text.secondary', fontWeight: 650 }}>
            抽出三名創作夥伴，組成你的隊伍，再進入五回合的創作對局。
          </Typography>
          <Stack spacing={1.1} sx={{ width: 'min(320px, 100%)' }}>
            <Button
              size="large"
              variant="contained"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={onStart}
              sx={{ py: 1.15, fontSize: 16, fontWeight: 950, borderRadius: 2 }}
            >
              開始遊戲
            </Button>
            <Button
              size="large"
              color="secondary"
              variant="contained"
              startIcon={<SchoolRoundedIcon />}
              onClick={onStartTutorial}
              sx={{ py: 1, fontSize: 15, fontWeight: 950, borderRadius: 2 }}
            >
              教學關卡
            </Button>
            <Button variant="outlined" onClick={onOpenRoster} sx={{ py: .85, fontWeight: 850, borderRadius: 2 }}>
              角色卡
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}