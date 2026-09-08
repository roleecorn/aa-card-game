import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import { CHARACTERS } from '../content/catalog';
import type { DieToken } from '../game/types';

const skillConfig = {
  design: { label: 'Design', icon: <EditNoteIcon fontSize="small" />, color: '#ff7599' },
  text: { label: 'Text', icon: <SubjectIcon fontSize="small" />, color: '#4f8fe6' },
  aa: { label: 'AA', icon: <LayersIcon fontSize="small" />, color: '#3bb8a5' },
} as const;

interface Props {
  dice: DieToken[];
  selectedDieId?: string;
  onSelect: (dieId: string) => void;
}

export function DiceTray({ dice, selectedDieId, onSelect }: Props) {
  if (!dice.length) return <Typography variant="body2" color="text.secondary">目前沒有待分配骰。</Typography>;
  return (
    <Stack direction="row" gap={.8} flexWrap="wrap">
      {dice.map((die, index) => {
        const config = skillConfig[die.skill];
        const selected = die.id === selectedDieId;
        return (
          <Tooltip key={die.id} title={`${CHARACTERS[die.ownerId]?.name ?? die.ownerId} · ${die.origin}`} arrow>
            <Paper
              component="button"
              type="button"
              onClick={() => onSelect(die.id)}
              elevation={0}
              sx={{ width: 58, height: 58, border: '2px solid', borderColor: selected ? config.color : '#cfd9e7', borderRadius: 2, display: 'grid', placeItems: 'center', cursor: 'pointer', bgcolor: '#fff', transform: `rotate(${index % 2 ? 2 : -2}deg)`, boxShadow: selected ? `0 0 0 3px ${config.color}22` : '0 2px 5px rgba(44,65,98,.08)' }}
            >
              <Box sx={{ textAlign: 'center', color: config.color, lineHeight: 1 }}>
                {config.icon}
                <Typography sx={{ fontSize: 19, fontWeight: 950, lineHeight: .95, color: 'text.primary' }}>{die.value}</Typography>
                <Typography sx={{ fontSize: 8.5, fontWeight: 800 }}>{config.label}</Typography>
              </Box>
            </Paper>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
