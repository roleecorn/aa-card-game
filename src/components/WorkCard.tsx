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
import type { WorkType } from '../game/schema';
import type { TargetLegality } from '../game/targeting';
import type { DieToken, ProgressSlot, WorkState } from '../game/types';

const genreIcons: Record<WorkType, React.ReactNode> = {
  燃: <LocalFireDepartmentIcon fontSize="small" />,
  謀: <PsychologyIcon fontSize="small" />,
  笑: <SentimentVerySatisfiedIcon fontSize="small" />,
  情: <FavoriteIcon fontSize="small" />,
  色: <PaletteIcon fontSize="small" />,
  怪: <AutoAwesomeIcon fontSize="small" />,
};

export const workCardTones = [
  { border: '#ff8dac', bg: '#fff7f9', progress: '#ff7599' },
  { border: '#75b8ee', bg: '#f7fbff', progress: '#55a7e7' },
  { border: '#b7c2d6', bg: '#fbfcfe', progress: '#9daec6' },
] as const;

export interface WorkCardProps {
  work: WorkState;
  index?: number;
  selectedDie?: DieToken;
  toneIndex?: number;
  onSlotClick?: (workId: string, slotIndex: number) => void;
  getSlotLegality?: (slotIndex: number) => TargetLegality;
  onCancelSelection?: () => void;
}

export function WorkCard({
  work,
  index = 0,
  selectedDie,
  toneIndex = index,
  onSlotClick,
  getSlotLegality,
  onCancelSelection,
}: WorkCardProps) {
  const completed = work.slots.filter(
    (slot) => slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined,
  ).length;
  const tone = workCardTones[toneIndex % workCardTones.length];
  const slotLegalities = getSlotLegality ? work.slots.map((_, slotIndex) => getSlotLegality(slotIndex)) : undefined;
  const hasLegalSlot = slotLegalities?.some((legality) => legality.allowed) ?? true;

  return (
    <Card
      onClick={getSlotLegality ? onCancelSelection : undefined}
      sx={{
        overflow: 'hidden',
        borderColor: tone.border,
        bgcolor: tone.bg,
        borderWidth: 1.5,
        transform: index % 2 ? 'rotate(.15deg)' : 'rotate(-.12deg)',
        opacity: getSlotLegality && !hasLegalSlot ? .42 : 1,
        transition: 'opacity .15s ease',
      }}
    >
      <CardContent sx={{ p: 1.15, '&:last-child': { pb: 1.15 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={.7} sx={{ mb: .8 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 950, lineHeight: 1.1 }} noWrap>
              #{String(index + 1).padStart(2, '0')} {work.title}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: .2 }}>
              負責人：{CHARACTERS[work.ownerId]?.name ?? work.ownerId}
            </Typography>
          </Box>
          <Chip
            icon={genreIcons[work.type] as React.ReactElement}
            label={work.type}
            size="small"
            sx={{ height: 23, bgcolor: '#fff', border: '1px solid #dce6f2' }}
          />
        </Stack>

        <Box
          sx={{
            minHeight: 76,
            border: '1px dashed #dce4ef',
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,.72)',
            p: .8,
            mb: .9,
          }}
        >
          <Typography sx={{ fontSize: 11, color: '#687895', lineHeight: 1.45 }}>
            這是一部正在製作中的作品。把 Design、Text、AA 逐步填滿，完成共同創作。
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${work.slots.length}, minmax(54px, 1fr))`,
            gap: .55,
            overflowX: 'auto',
            pb: .25,
          }}
        >
          {work.slots.map((slot, slotIndex) => (
            <ProgressCell
              key={slotIndex}
              slot={slot}
              index={slotIndex}
              selectedDie={selectedDie}
              legality={slotLegalities?.[slotIndex]}
              onClick={() => onSlotClick?.(work.id, slotIndex)}
              onCancel={onCancelSelection}
            />
          ))}
        </Box>

        <Stack direction="row" alignItems="center" spacing={.8} sx={{ mt: .85 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 850, color: 'text.secondary' }}>完成度</Typography>
          <LinearProgress
            variant="determinate"
            value={(completed / Math.max(1, work.slots.length)) * 100}
            sx={{
              flex: 1,
              height: 9,
              borderRadius: 10,
              bgcolor: '#e8eef6',
              border: '1px solid #cbd7e6',
              '& .MuiLinearProgress-bar': { bgcolor: tone.progress, borderRadius: 10 },
            }}
          />
          <Typography sx={{ fontSize: 11, fontWeight: 950 }}>
            {completed}/{work.slots.length}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProgressCell({
  slot,
  index,
  selectedDie,
  legality,
  onClick,
  onCancel,
}: {
  slot: ProgressSlot;
  index: number;
  selectedDie?: DieToken;
  legality?: TargetLegality;
  onClick: () => void;
  onCancel?: () => void;
}) {
  const targeting = legality !== undefined;
  const allowed = legality?.allowed ?? false;
  const hint = legality?.warning ?? legality?.reason ?? (allowed ? '點擊以放置此骰' : undefined);
  return (
    <Paper
      component="button"
      type="button"
      title={hint}
      onClick={(event) => {
        event.stopPropagation();
        if (targeting) {
          if (allowed) onClick();
          else onCancel?.();
        } else {
          onClick();
        }
      }}
      variant="outlined"
      sx={{
        p: .45,
        minWidth: 54,
        minHeight: 83,
        borderWidth: targeting ? (allowed ? 3 : 1) : selectedDie ? 2 : 1,
        borderStyle: targeting && allowed ? 'solid' : selectedDie ? 'dashed' : 'solid',
        borderColor: targeting ? (allowed ? 'warning.main' : '#aeb8c5') : selectedDie ? 'primary.main' : '#d8e1ed',
        cursor: targeting && allowed ? 'pointer' : targeting ? 'default' : selectedDie ? 'pointer' : 'default',
        bgcolor: targeting && allowed ? '#fff8e8' : selectedDie ? '#f4faff' : '#fff',
        opacity: targeting && !allowed ? .38 : 1,
        textAlign: 'left',
        boxShadow: targeting && allowed ? '0 0 0 3px rgba(255,180,59,.18)' : 'none',
        transition: 'opacity .15s ease, border-color .15s ease, box-shadow .15s ease',
      }}
    >
      <Typography sx={{ fontSize: 9.5, textAlign: 'center', color: 'text.secondary' }}>{index + 1}</Typography>
      <Stack spacing={.28} sx={{ mt: .25 }}>
        <ProgressLine icon={<EditNoteIcon fontSize="inherit" />} value={slot.design} tone="#ff6f98" />
        <ProgressLine icon={<SubjectIcon fontSize="inherit" />} value={slot.text} tone="#4f8fe6" />
        <ProgressLine icon={<LayersIcon fontSize="inherit" />} value={slot.aa} tone="#3bb8a5" />
      </Stack>
    </Paper>
  );
}

function ProgressLine({ icon, value, tone }: { icon: React.ReactNode; value?: number; tone: string }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={.25} sx={{ color: value ? tone : '#c6d0de' }}>
      <Box sx={{ display: 'flex', fontSize: 14 }}>{icon}</Box>
      <Typography sx={{ fontSize: 11, fontWeight: 950, color: value ? 'text.primary' : '#b9c4d2' }}>
        {value ?? '?'}
      </Typography>
    </Stack>
  );
}
