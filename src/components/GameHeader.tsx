import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StyleIcon from '@mui/icons-material/Style';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { GameState } from '../game/types';

interface Props {
  game: GameState;
  playerScore: number;
  enemyScore: number;
  onReset: () => void;
}

export function GameHeader({ game, playerScore, enemyScore, onReset }: Props) {
  return (
    <Paper sx={{ p: 1.5, position: 'sticky', top: 0, zIndex: 20, borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} gap={1.5} alignItems={{ lg: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ letterSpacing: -0.7 }}>創作同行！</Typography>
          <Typography variant="caption" color="text.secondary">Make Together · TypeScript Prototype</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Chip label={`Round ${game.round} / ${game.maxRounds}`} color="primary" />
          <Chip icon={<StyleIcon />} label={`Deck ${game.player.deck.length}`} variant="outlined" />
          <Chip icon={<DeleteSweepIcon />} label={`Discard ${game.player.discard.length}`} variant="outlined" />
          <Paper variant="outlined" sx={{ px: 1.2, py: 0.6, background: '#fff7f8' }}>
            <Typography fontWeight={900}>我方 {playerScore}</Typography>
          </Paper>
          <Typography fontWeight={900}>VS</Typography>
          <Paper variant="outlined" sx={{ px: 1.2, py: 0.6, background: '#f4f9ff' }}>
            <Typography fontWeight={900}>對手 {enemyScore}</Typography>
          </Paper>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={onReset}>重開</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
