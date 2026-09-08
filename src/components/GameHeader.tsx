import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StyleIcon from '@mui/icons-material/Style';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EditIcon from '@mui/icons-material/Edit';
import type { GameState } from '../game/types';

interface Props {
  game: GameState;
  playerScore: number;
  enemyScore: number;
  onReset: () => void;
}

const sketchBorder = '2px solid #dce6f4';

export function GameHeader({ game, playerScore, enemyScore, onReset }: Props) {
  return (
    <Paper square elevation={0} sx={{ position: 'sticky', top: 0, zIndex: 20, px: { xs: 1.5, md: 2.5 }, py: 1.15, border: 0, borderBottom: sketchBorder, bgcolor: 'rgba(255,253,248,.97)', backdropFilter: 'blur(12px)' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} gap={1.2} alignItems={{ lg: 'center' }} justifyContent="space-between">
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box sx={{ color: '#f2b72d', transform: 'rotate(-8deg)' }}><EditIcon /></Box>
          <Box>
            <Typography variant="h4" sx={{ lineHeight: .95, color: '#17243d' }}>創作同行！</Typography>
            <Typography variant="caption" sx={{ color: '#58709a', fontWeight: 800 }}>Make Together! · 把喜歡，變成作品。</Typography>
          </Box>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
          <Counter label="Round" value={`${game.round} / ${game.maxRounds}`} dark />
          <Counter icon={<StyleIcon fontSize="small" />} label="Deck" value={game.player.deck.length} />
          <Counter icon={<DeleteSweepIcon fontSize="small" />} label="Discard" value={game.player.discard.length} />
          <ScoreBox label="我方 Player" value={playerScore} tone="pink" />
          <Typography fontWeight={950} sx={{ px: .2, fontStyle: 'italic' }}>VS</Typography>
          <ScoreBox label="對手 Rival" value={enemyScore} tone="blue" />
          <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={onReset}>重開</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function Counter({ label, value, icon, dark }: { label: string; value: string | number; icon?: React.ReactNode; dark?: boolean }) {
  return (
    <Paper variant="outlined" sx={{ px: 1.1, py: .55, minWidth: dark ? 118 : 82, borderWidth: 1.5, bgcolor: dark ? '#24314b' : '#fff', color: dark ? '#fff' : 'text.primary', transform: dark ? 'rotate(-1.5deg)' : 'none' }}>
      <Stack direction="row" spacing={.7} alignItems="center">
        {icon}
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 800, opacity: .75, lineHeight: 1 }}>{label}</Typography>
          <Typography sx={{ fontSize: dark ? 18 : 15, fontWeight: 950, lineHeight: 1.15 }}>{value}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function ScoreBox({ label, value, tone }: { label: string; value: number; tone: 'pink' | 'blue' }) {
  const palette = tone === 'pink' ? { bg: '#fff1f5', border: '#ff87a8' } : { bg: '#eef8ff', border: '#72baf1' };
  return (
    <Paper variant="outlined" sx={{ px: 1.25, py: .5, bgcolor: palette.bg, borderColor: palette.border, borderWidth: 2, minWidth: 104 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography sx={{ fontSize: 11, whiteSpace: 'pre-line', fontWeight: 850, lineHeight: 1.05 }}>{label.replace(' ', '\n')}</Typography>
        <Typography sx={{ fontSize: 25, lineHeight: 1, fontWeight: 950 }}>{value}</Typography>
      </Stack>
    </Paper>
  );
}
