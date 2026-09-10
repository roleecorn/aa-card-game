import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { SKILLS } from '../content/catalog';
import type { CharacterDefinition } from '../game/schema';

interface Props {
  character: CharacterDefinition;
  onActivate?: (skillId: string) => void;
  canActivate?: (skillId: string) => boolean;
  compact?: boolean;
}

const labels = { implemented: '已實裝', partial: '部分實裝', planned: '規劃中' } as const;
const colors = { implemented: 'success', partial: 'warning', planned: 'default' } as const;

export function SkillList({ character, onActivate, canActivate, compact }: Props) {
  return (
    <Stack spacing={compact ? .45 : .8}>
      {character.skillIds.map((skillId) => {
        const skill = SKILLS[skillId];
        if (!skill) return null;
        const active = skill.activation === 'active' && skill.status !== 'planned';
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
              <Button
                data-tutorial={`skill-${skillId}`}
                size="small"
                variant="outlined"
                startIcon={compact ? undefined : <BoltIcon />}
                disabled={canActivate ? !canActivate(skillId) : false}
                onClick={() => onActivate(skillId)}
                sx={{ minWidth: compact ? 44 : 76, px: compact ? .5 : 1, py: .15, fontSize: compact ? 10 : 11, flexShrink: 0 }}
              >
                發動
              </Button>
            )}
          </Box>
        );
      })}
      {character.skillIds.length === 0 && <Typography variant="caption">無技能</Typography>}
    </Stack>
  );
}