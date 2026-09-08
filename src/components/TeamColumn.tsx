import { Box, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { CHARACTERS } from '../content/catalog';
import { EngineSession } from '../game/engine';
import type { ActionChoice, TeamState } from '../game/types';
import { CharacterCard } from './CharacterCard';

interface Props {
  title: string;
  team: TeamState;
  engine: EngineSession;
  showActions?: boolean;
  actionChoices?: Record<string, ActionChoice>;
  onActionChange?: (memberId: string, action: ActionChoice) => void;
  onActivateSkill?: (memberId: string, skillId: string) => void;
  side?: 'player' | 'enemy';
}

export function TeamColumn({ title, team, engine, showActions, actionChoices, onActionChange, onActivateSkill, side = 'player' }: Props) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={.7} alignItems="center" sx={{ px: .3 }}>
        <AutoAwesomeIcon sx={{ color: side === 'player' ? '#f4ba45' : '#5ca9e8', fontSize: 19 }} />
        <Typography variant="h6" sx={{ fontSize: 17 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: side === 'player' ? '#2d79c7' : '#6279a5', fontStyle: 'italic', fontWeight: 800 }}>
          {side === 'player' ? 'My Team' : 'Rival Team'}
        </Typography>
      </Stack>
      {team.members.map((member, index) => {
        const definition = CHARACTERS[member.defId];
        if (!definition) return null;
        return (
          <Box key={member.defId} sx={{ transform: index % 2 ? 'rotate(.25deg)' : 'rotate(-.2deg)' }}>
            <CharacterCard
              definition={definition}
              state={member}
              stats={{ design: engine.getEffectiveStat(member.defId, 'design'), text: engine.getEffectiveStat(member.defId, 'text'), aa: engine.getEffectiveStat(member.defId, 'aa') }}
              action={actionChoices?.[member.defId]}
              showActions={showActions}
              onActionChange={(action) => onActionChange?.(member.defId, action)}
              onActivateSkill={onActivateSkill ? (skillId) => onActivateSkill(member.defId, skillId) : undefined}
              canActivateSkill={(skillId) => engine.canUseActiveSkill(member.defId, skillId)}
              compact
            />
          </Box>
        );
      })}
    </Stack>
  );
}
