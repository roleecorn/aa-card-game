import { Box, Card, CardContent, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PaletteIcon from '@mui/icons-material/Palette';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import { CHARACTERS } from '../content/catalog';
import type { DieToken, ProgressSlot, WorkState } from '../game/types';
import type { WorkType } from '../game/schema';

interface Props {
  works: WorkState[];
  selectedDie?: DieToken;
  onSlotClick?: (workId: string, slotIndex: number) => void;
}

const genreIcons: Record<WorkType, React.ReactNode> = {
  燃: <LocalFireDepartmentIcon fontSize="small" />,
  謀: <PsychologyIcon fontSize="small" />,
  笑: <SentimentVerySatisfiedIcon fontSize="small" />,
  情: <FavoriteIcon fontSize="small" />,
  色: <PaletteIcon fontSize="small" />,
  怪: <AutoAwesomeIcon fontSize="small" />,
};

export function WorkBoard({ works, selectedDie, onSlotClick }: Props) {
  return (
    <Stack spacing={1.5}>
      {works.map((work) => {
        const completed = work.slots.filter((slot) => slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined).length;
        return (
          <Card key={work.id} sx={{ overflow: 'visible' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{work.title}</Typography>
                  <Typography variant="caption" color="text.secondary">負責人：{CHARACTERS[work.ownerId]?.name ?? work.ownerId}</Typography>
                </Box>
                <Chip icon={genreIcons[work.type] as React.ReactElement} label={work.type} size="small" variant="outlined" />
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${work.slots.length}, minmax(76px, 1fr))`, gap: 0.8, overflowX: 'auto', pb: 0.4 }}>
                {work.slots.map((slot, index) => (
                  <ProgressCell
                    key={index}
                    slot={slot}
                    index={index}
                    selectedDie={selectedDie}
                    onClick={() => onSlotClick?.(work.id, index)}
                  />
                ))}
              </Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(completed / Math.max(1, work.slots.length)) * 100}
                  sx={{ flex: 1, height: 8, borderRadius: 10 }}
                />
                <Typography variant="caption" fontWeight={800}>{completed}/{work.slots.length}</Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function ProgressCell({ slot, index, selectedDie, onClick }: { slot: ProgressSlot; index: number; selectedDie?: DieToken; onClick: () => void }) {
  return (
    <Paper
      component="button"
      type="button"
      onClick={onClick}
      variant="outlined"
      sx={{
        p: 0.75,
        minWidth: 76,
        borderWidth: selectedDie ? 2 : 1,
        borderStyle: selectedDie ? 'dashed' : 'solid',
        borderColor: selectedDie ? 'primary.main' : 'divider',
        cursor: selectedDie ? 'pointer' : 'default',
        backgroundColor: selectedDie ? 'rgba(75,147,220,.035)' : 'background.paper',
        textAlign: 'left',
      }}
    >
      <Typography variant="caption" color="text.secondary">#{index + 1}</Typography>
      <Stack spacing={0.45} sx={{ mt: 0.5 }}>
        <ProgressLine icon={<EditNoteIcon fontSize="inherit" />} label="D" value={slot.design} tone="#ff7587" />
        <ProgressLine icon={<SubjectIcon fontSize="inherit" />} label="T" value={slot.text} tone="#4b93dc" />
        <ProgressLine icon={<LayersIcon fontSize="inherit" />} label="AA" value={slot.aa} tone="#4db8a8" />
      </Stack>
    </Paper>
  );
}

function ProgressLine({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value?: number; tone: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', alignItems: 'center', gap: 0.35, color: value ? 'text.primary' : 'text.disabled' }}>
      <Box sx={{ color: value ? tone : 'text.disabled', display: 'flex' }}>{icon}</Box>
      <Typography variant="caption" fontWeight={800}>{label}</Typography>
      <Typography variant="caption" fontWeight={900}>{value ?? '—'}</Typography>
    </Box>
  );
}
