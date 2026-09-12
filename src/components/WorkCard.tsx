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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
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

const workProgressDescription = '這是一部正在製作中的作品。把 Design、Text、AA 逐步填滿，完成共同創作。';

export const workCardTones = [
  { border: '#ff8dac', bg: '#fff7f9', progress: '#ff7599', preview: '#fff0f5' },
  { border: '#75b8ee', bg: '#f7fbff', progress: '#55a7e7', preview: '#edf7ff' },
  { border: '#b7c2d6', bg: '#fbfcfe', progress: '#9daec6', preview: '#f1f4f8' },
] as const;

export interface WorkCardProps {
  work: WorkState;
  index?: number;
  score?: number;
  selectedDie?: DieToken;
  toneIndex?: number;
  onSlotClick?: (workId: string, slotIndex: number) => void;
  getSlotLegality?: (slotIndex: number) => TargetLegality;
  onCancelSelection?: () => void;
}

export function WorkCard({
  work,
  index = 0,
  score,
  selectedDie,
  toneIndex = index,
  onSlotClick,
  getSlotLegality,
  onCancelSelection,
}: WorkCardProps) {
  const completed = work.slots.filter(isSlotComplete).length;
  const tone = workCardTones[toneIndex % workCardTones.length];
  const slotLegalities = getSlotLegality ? work.slots.map((_, slotIndex) => getSlotLegality(slotIndex)) : undefined;
  const hasLegalSlot = slotLegalities?.some((legality) => legality.allowed) ?? true;
  const ownerName = CHARACTERS[work.ownerId]?.name ?? work.ownerId;

  return (
    <Card
      aria-label={`${work.title}。${workProgressDescription}`}
      onClick={getSlotLegality ? onCancelSelection : undefined}
      sx={{
        overflow: 'hidden',
        borderColor: tone.border,
        bgcolor: tone.bg,
        borderWidth: 1.5,
        borderRadius: 2.25,
        boxShadow: '0 4px 14px rgba(58,77,108,.07)',
        transform: index % 2 ? 'rotate(.1deg)' : 'rotate(-.08deg)',
        opacity: getSlotLegality && !hasLegalSlot ? .42 : 1,
        transition: 'opacity .15s ease',
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={.7}
          sx={{ px: 1.15, pt: 1.05, pb: .85, borderBottom: `1px solid ${tone.border}55` }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 950, lineHeight: 1.15 }} noWrap>
              #{String(index + 1).padStart(2, '0')} {work.title}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: .25 }} noWrap>
              負責人：{ownerName}
            </Typography>
          </Box>
          <Chip
            icon={genreIcons[work.type] as React.ReactElement}
            label={work.type}
            size="small"
            sx={{
              height: 24,
              flexShrink: 0,
              bgcolor: '#fff',
              border: `1px solid ${tone.border}88`,
              '& .MuiChip-label': { fontWeight: 900 },
            }}
          />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '92px minmax(0,1fr)',
            gap: .9,
            px: 1.05,
            py: .9,
            bgcolor: 'rgba(255,255,255,.38)',
          }}
        >
          <Box
            sx={{
              minHeight: 72,
              borderRadius: 1.5,
              border: `1px solid ${tone.border}66`,
              bgcolor: tone.preview,
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: 54,
                height: 54,
                borderRadius: '50%',
                border: `1px dashed ${tone.border}88`,
                right: -18,
                top: -18,
              },
            }}
          >
            <Stack spacing={.15} alignItems="center" sx={{ position: 'relative', zIndex: 1, color: tone.progress }}>
              <Box sx={{ display: 'flex', '& svg': { fontSize: 31 } }}>{genreIcons[work.type]}</Box>
              <Typography sx={{ fontSize: 10, fontWeight: 950, letterSpacing: '.08em' }}>作品 · {work.type}</Typography>
            </Stack>
          </Box>

          <Stack justifyContent="center" spacing={.55} sx={{ minWidth: 0 }}>
            <Box>
              <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 800 }}>作品進度</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 900, mt: .1 }}>
                Design → Text → AA
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 800 }}>完成度</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 900, mt: .1 }}>
                {completed} / {work.slots.length}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${work.slots.length}, minmax(62px, 1fr))`,
            gap: .5,
            overflowX: 'auto',
            px: 1.05,
            py: .9,
            borderTop: '1px solid rgba(202,214,228,.65)',
            borderBottom: '1px solid rgba(202,214,228,.65)',
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

        <Stack direction="row" alignItems="center" spacing={.75} sx={{ px: 1.05, py: .8 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 850, color: 'text.secondary', flexShrink: 0 }}>完成度</Typography>
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
          <Typography sx={{ fontSize: 11, fontWeight: 950, minWidth: 28 }}>
            {completed}/{work.slots.length}
          </Typography>
          {score !== undefined && (
            <Chip
              label={`Score ${score}`}
              size="small"
              sx={{ height: 23, bgcolor: '#fff', border: '1px solid #d7e1ec', '& .MuiChip-label': { px: .75, fontSize: 10.5, fontWeight: 900 } }}
            />
          )}
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
  const complete = isSlotComplete(slot);
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
        p: .42,
        minWidth: 62,
        minHeight: 112,
        borderWidth: targeting ? (allowed ? 3 : 1) : selectedDie ? 2 : 1,
        borderStyle: targeting && allowed ? 'solid' : selectedDie ? 'dashed' : 'solid',
        borderColor: targeting ? (allowed ? 'warning.main' : '#aeb8c5') : selectedDie ? 'primary.main' : '#d8e1ed',
        cursor: targeting && allowed ? 'pointer' : targeting ? 'default' : selectedDie ? 'pointer' : 'default',
        bgcolor: targeting && allowed ? '#fff8e8' : '#fff',
        opacity: targeting && !allowed ? .38 : 1,
        textAlign: 'left',
        color: 'text.primary',
        font: 'inherit',
        boxShadow: targeting && allowed ? '0 0 0 3px rgba(255,180,59,.18)' : 'none',
        transition: 'opacity .15s ease, border-color .15s ease, box-shadow .15s ease',
      }}
    >
      <Typography sx={{ fontSize: 9.5, textAlign: 'center', color: 'text.secondary', fontWeight: 850, mb: .25 }}>
        {index + 1}
      </Typography>
      <Stack spacing={.28}>
        <ProgressLine icon={<EditNoteIcon fontSize="inherit" />} value={slot.design} tone="#ff6f98" />
        <ProgressLine icon={<SubjectIcon fontSize="inherit" />} value={slot.text} tone="#4f8fe6" locked={slot.design === undefined} />
        <ProgressLine icon={<LayersIcon fontSize="inherit" />} value={slot.aa} tone="#3bb8a5" locked={slot.text === undefined} />
      </Stack>
      <Box sx={{ height: 22, display: 'grid', placeItems: 'center', mt: .25 }}>
        {complete ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 17, color: '#ee6d92' }} />
        ) : (
          <Box sx={{ width: 14, borderTop: '1px dashed #d2dbe6' }} />
        )}
      </Box>
    </Paper>
  );
}

function ProgressLine({ icon, value, tone, locked = false }: { icon: React.ReactNode; value?: number; tone: string; locked?: boolean }) {
  if (locked && value === undefined) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={.28} sx={{ minHeight: 19, color: '#c4ccd7' }}>
        <LockOutlinedIcon sx={{ fontSize: 12.5 }} />
        <Typography sx={{ fontSize: 10.5, fontWeight: 850, color: '#c4ccd7' }}>?</Typography>
      </Stack>
    );
  }

  const filled = value !== undefined;
  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={.28} sx={{ minHeight: 19, color: filled ? tone : '#c6d0de' }}>
      <Box sx={{ display: 'flex', fontSize: 14.5 }}>{icon}</Box>
      <Typography sx={{ fontSize: 11, fontWeight: 950, color: filled ? 'text.primary' : '#b9c4d2' }}>
        {filled ? value : '?'}
      </Typography>
    </Stack>
  );
}

function isSlotComplete(slot: ProgressSlot): boolean {
  return slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined;
}
