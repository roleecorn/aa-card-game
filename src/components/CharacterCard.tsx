import {
  Box,
  Card,
  CardContent,
  CardMedia,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import CoffeeIcon from '@mui/icons-material/Coffee';
import type { ActionChoice, CharacterState } from '../game/types';
import type { CharacterDefinition } from '../game/schema';
import { SkillList } from './SkillList';

interface Props {
  definition: CharacterDefinition;
  state: CharacterState;
  stats: CharacterDefinition['stats'];
  action?: ActionChoice;
  showActions?: boolean;
  onActionChange?: (action: ActionChoice) => void;
  onActivateSkill?: (skillId: string) => void;
  canActivateSkill?: (skillId: string) => boolean;
}

export function CharacterCard({
  definition,
  state,
  stats,
  action,
  showActions,
  onActionChange,
  onActivateSkill,
  canActivateSkill,
}: Props) {
  const maxStress = definition.maxStress ?? 1;
  const stressPercent = definition.maxStress === null ? 0 : Math.min(100, (state.stress / maxStress) * 100);
  return (
    <Card sx={{ overflow: 'hidden', background: '#fff' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: definition.portrait ? { xs: '104px minmax(0, 1fr)', sm: '128px minmax(0, 1fr)' } : '1fr', alignItems: 'start' }}>
        {definition.portrait && (
          <Box sx={{ p: 1, pr: 0 }}>
            <CardMedia
              component="img"
              image={definition.portrait}
              alt={definition.name}
              sx={{
                width: '100%',
                aspectRatio: '3 / 4',
                objectFit: 'cover',
                objectPosition: 'center',
                borderRadius: 2,
                display: 'block',
              }}
            />
          </Box>
        )}
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.1, mb: 1 }}>{definition.name}</Typography>
          <Stack direction="row" spacing={1.2} sx={{ mb: 1 }}>
            <Stat icon={<EditNoteIcon fontSize="small" />} label="Design" value={stats.design} />
            <Stat icon={<SubjectIcon fontSize="small" />} label="Text" value={stats.text} />
            <Stat icon={<LayersIcon fontSize="small" />} label="AA" value={stats.aa} />
          </Stack>
          <Typography variant="caption" color="text.secondary">壓力 {state.stress}{definition.maxStress === null ? '' : ` / ${definition.maxStress}`}</Typography>
          <LinearProgress
            variant="determinate"
            value={stressPercent}
            color={stressPercent >= 80 ? 'secondary' : 'primary'}
            sx={{ height: 7, borderRadius: 8, mb: 1.2 }}
          />
          <SkillList character={definition} onActivate={onActivateSkill} canActivate={canActivateSkill} />
          {showActions && (
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={action ?? 'work'}
              onChange={(_, next: ActionChoice | null) => next && onActionChange?.(next)}
              sx={{ mt: 1.2 }}
            >
              <ToggleButton value="work">創作</ToggleButton>
              <ToggleButton value="slack"><CoffeeIcon fontSize="small" sx={{ mr: 0.5 }} />摸魚</ToggleButton>
            </ToggleButtonGroup>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.35} alignItems="center">{icon}<Typography variant="caption" fontWeight={800}>{label}</Typography></Stack>
      <Typography fontWeight={900}>{value}</Typography>
    </Box>
  );
}
