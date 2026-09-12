import { Box, Paper, Tooltip, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import { CHARACTERS } from '../content/catalog';
import type { DieToken as DieTokenModel } from '../game/types';

const skillConfig = {
  design: { label: 'Design', icon: <EditNoteIcon fontSize="small" />, color: '#ff7599' },
  text: { label: 'Text', icon: <SubjectIcon fontSize="small" />, color: '#4f8fe6' },
  aa: { label: 'AA', icon: <LayersIcon fontSize="small" />, color: '#3bb8a5' },
} as const;

export interface DieTokenProps {
  die: DieTokenModel;
  selected?: boolean;
  rotation?: number;
  onSelect?: (dieId: string) => void;
}

export function DieToken({ die, selected = false, rotation = 0, onSelect }: DieTokenProps) {
  const config = skillConfig[die.skill];

  return (
    <Tooltip title={`${CHARACTERS[die.ownerId]?.name ?? die.ownerId} · ${die.origin}`} arrow>
      <Paper
        component="button"
        data-feedback-anchor={`die:${die.id}`}
        type="button"
        onClick={() => onSelect?.(die.id)}
        elevation={0}
        sx={{
          width: 58,
          height: 58,
          border: '2px solid',
          borderColor: selected ? config.color : '#cfd9e7',
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          cursor: onSelect ? 'pointer' : 'default',
          bgcolor: '#fff',
          transform: `rotate(${rotation}deg)`,
          boxShadow: selected ? `0 0 0 3px ${config.color}22` : '0 2px 5px rgba(44,65,98,.08)',
        }}
      >
        <Box sx={{ textAlign: 'center', color: config.color, lineHeight: 1 }}>
          {config.icon}
          <Typography sx={{ fontSize: 19, fontWeight: 950, lineHeight: .95, color: 'text.primary' }}>
            {die.value}
          </Typography>
          <Typography sx={{ fontSize: 8.5, fontWeight: 800 }}>{config.label}</Typography>
        </Box>
      </Paper>
    </Tooltip>
  );
}
