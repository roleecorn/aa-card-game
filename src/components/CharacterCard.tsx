import {
  Box,
  Card,
  Chip,
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
import { getCharacterTagName } from '../content/characterTags';
import { SkillList } from './SkillList';

interface Props {
  definition: CharacterDefinition;
  state: CharacterState;
  stats: CharacterDefinition['stats'];
  action?: ActionChoice;
  showActions?: boolean;
  compact?: boolean;
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
  compact,
  onActionChange,
  onActivateSkill,
  canActivateSkill,
}: Props) {
  const maxStress = definition.maxStress ?? 1;
  const stressPercent = definition.maxStress === null ? 0 : Math.min(100, (state.stress / maxStress) * 100);
  const portrait = compact ? definition.compactPortrait : definition.portrait;
  const portraitPosition = compact && definition.compactPortrait
    ? 'center'
    : definition.portraitPosition
    ? `${definition.portraitPosition.x}% ${definition.portraitPosition.y}%`
    : 'center 22%';
  const actionsDisabled = definition.tags?.includes('cannot-act') ?? false;

  return (
    <Card sx={{ overflow: 'hidden', bgcolor: '#fff', borderWidth: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: portrait ? (compact ? '56% 44%' : { xs: '118px minmax(0,1fr)', sm: '148px minmax(0,1fr)' }) : '1fr', minHeight: compact ? 138 : 188 }}>
        {portrait && (
          <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: compact ? 138 : 188, bgcolor: '#f1f5fa' }}>
            <Box
              component="img"
              src={portrait}
              alt={definition.name}
              sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0, objectFit: 'cover', objectPosition: portraitPosition, display: 'block' }}
            />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 54%, rgba(26,38,62,.58) 100%)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', left: 7, top: 7, px: .8, py: .2, bgcolor: 'rgba(255,255,255,.94)', border: '1.5px solid #d7e2ef', borderRadius: 1, transform: 'rotate(-3deg)', boxShadow: '0 1px 3px rgba(31,48,78,.1)' }}>
              <Typography sx={{ fontSize: compact ? 15 : 18, lineHeight: 1, fontWeight: 950, color: '#1e2b45' }}>{definition.name}</Typography>
            </Box>
            {!compact && (
              <Typography sx={{ position: 'absolute', left: 10, bottom: 8, color: '#fff', fontSize: 11, fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,.4)' }}>
                創作夥伴
              </Typography>
            )}
          </Box>
        )}

        <Stack sx={{ p: compact ? 1 : 1.35, minWidth: 0 }} spacing={compact ? .45 : .75}>
          {!definition.portrait && <Typography variant="h6">{definition.name}</Typography>}
          <Stat icon={<EditNoteIcon />} label="Design" value={stats.design} tone="#ff6f98" compact={compact} />
          <Stat icon={<SubjectIcon />} label="Text" value={stats.text} tone="#4f8fe6" compact={compact} />
          <Stat icon={<LayersIcon />} label="AA" value={stats.aa} tone="#3bb8a5" compact={compact} />

          {!!definition.tags?.length && (
            <Stack direction="row" spacing={.45} flexWrap="wrap" useFlexGap>
              {definition.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={getCharacterTagName(tag)}
                  size="small"
                  sx={{
                    height: compact ? 19 : 21,
                    bgcolor: '#fff7fa',
                    border: '1px solid #f2bfd0',
                    color: '#8b3f58',
                    fontSize: compact ? 9.5 : 10.5,
                    fontWeight: 850,
                    '& .MuiChip-label': { px: compact ? .65 : .8 },
                  }}
                />
              ))}
            </Stack>
          )}

          <Box sx={{ pt: .2 }}>
            {definition.resource ? (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary' }}>{definition.resource.name}</Typography>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 900 }}>
                    {state.resources?.[definition.resource.name] ?? definition.resource.initial} / {definition.resource.max}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={((state.resources?.[definition.resource.name] ?? definition.resource.initial) / definition.resource.max) * 100}
                  sx={{ mt: .25, height: 8, borderRadius: 8, bgcolor: '#e6edf6', border: '1px solid #aab9cd' }}
                />
              </>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary' }}>壓力 Stress</Typography>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 900 }}>{state.stress} / {definition.maxStress === null ? '∞' : definition.maxStress}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={stressPercent}
                  sx={{ mt: .25, height: 8, borderRadius: 8, bgcolor: '#e6edf6', border: '1px solid #aab9cd', '& .MuiLinearProgress-bar': { bgcolor: stressPercent >= 80 ? '#ef6e78' : '#ff86aa', borderRadius: 8 } }}
                />
              </>
            )}
          </Box>

          {!compact && <SkillList character={definition} onActivate={onActivateSkill} canActivate={canActivateSkill} />}
          {showActions && (actionsDisabled ? (
            <Typography sx={{ mt: .4, py: .55, textAlign: 'center', fontSize: 11, fontWeight: 850, color: 'text.secondary' }}>
              此角色不能行動
            </Typography>
          ) : (
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={action ?? 'work'}
              onChange={(_, next: ActionChoice | null) => next && onActionChange?.(next)}
              sx={{ mt: .4, '& .MuiToggleButton-root': { py: .35, fontSize: 11, fontWeight: 850 } }}
            >
              <ToggleButton data-tutorial={`action-${definition.id}-work`} value="work">創作</ToggleButton>
              <ToggleButton data-tutorial={`action-${definition.id}-slack`} value="slack"><CoffeeIcon sx={{ mr: .35, fontSize: 15 }} />摸魚</ToggleButton>
            </ToggleButtonGroup>
          ))}
        </Stack>
      </Box>
      {compact && definition.skillIds.length > 0 && (
        <Box sx={{ borderTop: '1px dashed #d9e3ef', px: .8, py: .55, bgcolor: '#fffefb' }}>
          <SkillList character={definition} onActivate={onActivateSkill} canActivate={canActivateSkill} compact />
        </Box>
      )}
    </Card>
  );
}

function Stat({ icon, label, value, tone, compact }: { icon: React.ReactNode; label: string; value: number; tone: string; compact?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={.6}>
      <Stack direction="row" spacing={.4} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={{ color: tone, display: 'flex', '& svg': { fontSize: compact ? 17 : 19 } }}>{icon}</Box>
        <Typography sx={{ fontSize: compact ? 11.5 : 12.5, fontWeight: 850 }}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontSize: compact ? 16 : 18, lineHeight: 1, fontWeight: 950 }}>{value}</Typography>
    </Stack>
  );
}
