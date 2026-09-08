import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { SKILLS } from '../content/catalog';
import type { CharacterDefinition } from '../game/schema';

interface Props {
  character: CharacterDefinition;
  onActivate?: (skillId: string) => void;
  canActivate?: (skillId: string) => boolean;
}

const labels = { implemented: '已實裝', partial: '部分實裝', planned: '規劃中' } as const;
const colors = { implemented: 'success', partial: 'warning', planned: 'default' } as const;

export function SkillList({ character, onActivate, canActivate }: Props) {
  return (
    <Stack spacing={0.8}>
      {character.skillIds.map((skillId) => {
        const skill = SKILLS[skillId];
        if (!skill) return null;
        const active = skill.activation === 'active' && skill.status !== 'planned';
        return (
          <Box key={skillId} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <Tooltip title={skill.description} arrow>
              <Chip
                size="small"
                label={`${skill.name} · ${labels[skill.status]}`}
                color={colors[skill.status]}
                variant={skill.status === 'implemented' ? 'filled' : 'outlined'}
                sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
              />
            </Tooltip>
            {active && onActivate && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<BoltIcon />}
                disabled={canActivate ? !canActivate(skillId) : false}
                onClick={() => onActivate(skillId)}
                sx={{ minWidth: 76, flexShrink: 0 }}
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
