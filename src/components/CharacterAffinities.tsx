import { Chip, Stack, Typography } from '@mui/material';
import type { WorkType } from '../game/schema';

interface Props {
  affinities: WorkType[];
  compact?: boolean;
}

export function CharacterAffinities({ affinities, compact = false }: Props) {
  const label = affinities.length > 0 ? affinities.join('、') : '無';

  return (
    <Stack
      direction="row"
      spacing={.45}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      aria-label={`適性：${label}`}
    >
      <Typography
        sx={{
          fontSize: compact ? 9.5 : 10.5,
          color: 'text.secondary',
          fontWeight: 850,
          mr: .1,
        }}
      >
        適性
      </Typography>
      {affinities.length > 0 ? affinities.map((affinity) => (
        <Chip
          key={affinity}
          label={affinity}
          size="small"
          sx={{
            height: compact ? 19 : 22,
            bgcolor: '#f4f8ff',
            border: '1px solid #b9ccec',
            color: '#365a8c',
            fontSize: compact ? 9.5 : 10.5,
            fontWeight: 900,
            '& .MuiChip-label': { px: compact ? .65 : .8 },
          }}
        />
      )) : (
        <Typography sx={{ fontSize: compact ? 9.5 : 10.5, color: 'text.secondary', fontWeight: 750 }}>
          無
        </Typography>
      )}
    </Stack>
  );
}
