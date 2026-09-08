import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import { CHARACTERS } from '../content/catalog';
import type { DieToken } from '../game/types';

const skillConfig = {
  design: { label: 'D', icon: <EditNoteIcon fontSize="small" />, color: '#ff7587' },
  text: { label: 'T', icon: <SubjectIcon fontSize="small" />, color: '#4b93dc' },
  aa: { label: 'AA', icon: <LayersIcon fontSize="small" />, color: '#4db8a8' },
} as const;

interface Props {
  dice: DieToken[];
  selectedDieId?: string;
  onSelect: (dieId: string) => void;
}

export function DiceTray({ dice, selectedDieId, onSelect }: Props) {
  if (!dice.length) return <Typography variant="body2" color="text.secondary">目前沒有待分配骰。</Typography>;
  return (
    <Stack direction="row" gap={1} flexWrap="wrap">
      {dice.map((die) => {
        const config = skillConfig[die.skill];
        const selected = die.id === selectedDieId;
        return (
          <Tooltip key={die.id} title={`${CHARACTERS[die.ownerId]?.name ?? die.ownerId} · ${die.origin}`} arrow>
            <Paper
              component="button"
              type="button"
              onClick={() => onSelect(die.id)}
              elevation={selected ? 5 : 1}
              sx={{
                width: 58,
                height: 58,
                border: '2px solid',
                borderColor: selected ? config.color : 'transparent',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                background: '#fff',
              }}
            >
              <Box sx={{ textAlign: 'center', color: config.color, lineHeight: 1 }}>
                {config.icon}
                <Typography variant="h6" sx={{ lineHeight: 1, color: 'text.primary' }}>{die.value}</Typography>
                <Typography variant="caption" sx={{ fontSize: 10 }}>{config.label}</Typography>
              </Box>
            </Paper>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
