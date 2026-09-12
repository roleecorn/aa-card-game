import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { SKILLS } from '../content/catalog';
import type { CharacterDefinition } from '../game/schema';

interface Props {
  character: CharacterDefinition;
  onActivate?: (skillId: string) => void;
  canActivate?: (skillId: string) => boolean;
  getDisabledReason?: (skillId: string) => string | undefined;
  compact?: boolean;
}

const labels = { implemented: '已實裝', partial: '部分實裝', planned: '規劃中' } as const;
const colors = { implemented: 'success', partial: 'warning', planned: 'default' } as const;

export function SkillList({ character, onActivate, canActivate, getDisabledReason, compact }: Props) {
  return (
    <Stack spacing={compact ? .45 : .8}>
      {character.skillIds.map((skillId) => {
        const skill = SKILLS[skillId];
        if (!skill) return null;
        const active = skill.activation === 'active' && skill.status !== 'planned';
        const enabled = canActivate ? canActivate(skillId) : true;
        const disabledReason = enabled ? undefined : getDisabledReason?.(skillId) ?? '目前沒有合法目標，或技能的使用次數已耗盡。';
        return (
          <Box key={skillId} sx={{ display: 'flex', gap: .5, alignItems: 'center', minWidth: 0 }}>
            <Tooltip title={skill.description} arrow>
              <Chip
                size="small"
                label={compact ? skill.name : `${skill.name} · ${labels[skill.status]}`}
                color={colors[skill.status]}
                variant="outlined"
                sx={{ height: compact ? 22 : 26, maxWidth: '100%', bgcolor: '#fff', '& .MuiChip-label': { px: compact ? .7 : 1, fontSize: compact ? 10 : 11, overflow: 'hidden', textOverflow: 'ellipsis' } }}
              />
            </Tooltip>
            {active && onActivate && (
              <Tooltip title={disabledReason ?? ''} arrow disableHoverListener={!disabledReason}>
                <span>
                  <Button
                    data-tutorial={`skill-${skillId}`}
                    size="small"
                    variant="outlined"
                    startIcon={compact ? undefined : <BoltIcon />}
                    disabled={!enabled}
                    onClick={() => onActivate(skillId)}
                    sx={{ minWidth: compact ? 44 : 76, px: compact ? .5 : 1, py: .15, fontSize: compact ? 10 : 11, flexShrink: 0 }}
                  >
                    發動
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
        );
      })}
      {character.skillIds.length === 0 && <Typography variant="caption">無技能</Typography>}
    </Stack>
  );
}
