import { Box, Card, CardContent, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PaletteIcon from '@mui/icons-material/Palette';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LayersIcon from '@mui/icons-material/Layers';
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
  { border: '#ff8dac', bg: '#fff7f9', progress: '#ff7599' },
  { border: '#75b8ee', bg: '#f7fbff', progress: '#55a7e7' },
  { border: '#b7c2d6', bg: '#fbfcfe', progress: '#9daec6' },
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
        borderRadius: '8px',
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
            gridTemplateColumns: `repeat(${work.slots.length}, minmax(50px, 1fr))`,
            gap: .5,
            overflowX: 'auto',
            px: 1.05,
            py: 1,
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

        <Stack
          direction="row"
          alignItems="center"
          spacing={.75}
          sx={{ px: 1.05, py: .8, borderTop: '1px solid rgba(202,214,228,.65)' }}
        >
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
        p: 0,
        minWidth: 50,
        minHeight: 150,
        overflow: 'hidden',
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
      <Box sx={{ bgcolor: '#f1f4f8', borderBottom: '1px solid #d8e1ed', py: .28 }}>
        <Typography sx={{ fontSize: 10, textAlign: 'center', color: 'text.secondary', fontWeight: 900 }}>
          {index + 1}
        </Typography>
      </Box>

      <Stack alignItems="center" spacing={.55} sx={{ px: .35, pt: .55 }}>
        <ProgressMark
          icon={<LocalFireDepartmentIcon />}
          value={slot.design}
          tone="#ef6949"
          label="Design"
        />
        <ProgressMark
          icon={<DescriptionOutlinedIcon />}
          value={slot.text}
          tone="#4f8fe6"
          label="Text"
        />
        <ProgressMark
          icon={<LayersIcon />}
          value={slot.aa}
          tone="#39ae9c"
          label="AA"
        />
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

function ProgressMark({ icon, value, tone, label }: { icon: React.ReactNode; value?: number; tone: string; label: string }) {
  const filled = value !== undefined;

  return (
    <Box
      aria-label={`${label}${filled ? ` ${value}` : ' 尚未完成'}`}
      sx={{
        width: 34,
        minHeight: 31,
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {filled && (
        <Typography
          component="span"
          sx={{
            position: 'absolute',
            top: -4,
            right: -1,
            minWidth: 15,
            height: 15,
            px: .2,
            borderRadius: 7.5,
            bgcolor: '#fff',
            border: `1px solid ${tone}66`,
            color: '#303645',
            display: 'grid',
            placeItems: 'center',
            fontSize: 9,
            lineHeight: 1,
            fontWeight: 950,
            zIndex: 1,
          }}
        >
          {value}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          color: filled ? tone : '#c8d0dc',
          opacity: filled ? 1 : .72,
          '& svg': { fontSize: 26 },
          transition: 'color .15s ease, opacity .15s ease',
        }}
      >
        {icon}
      </Box>
    </Box>
  );
}

function isSlotComplete(slot: ProgressSlot): boolean {
  return slot.design !== undefined && slot.text !== undefined && slot.aa !== undefined;
}
