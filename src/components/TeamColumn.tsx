import { Box, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { CHARACTERS } from '../content/catalog';
import { EngineSession } from '../game/engine';
import { getSkillAvailability, type TargetCandidate } from '../game/targeting';
import type { ActionChoice, TeamState } from '../game/types';
import { CharacterCard } from './CharacterCard';

interface MemberSelection {
  candidates: TargetCandidate[];
  onSelect: (memberId: string) => void;
  onCancel: () => void;
}

interface Props {
  title: string;
  team: TeamState;
  engine: EngineSession;
  showActions?: boolean;
  actionChoices?: Record<string, ActionChoice>;
  onActionChange?: (memberId: string, action: ActionChoice) => void;
  onActivateSkill?: (memberId: string, skillId: string) => void;
  side?: 'player' | 'enemy';
  selection?: MemberSelection;
}

export function TeamColumn({ title, team, engine, showActions, actionChoices, onActionChange, onActivateSkill, side = 'player', selection }: Props) {
  const candidateMap = new Map(selection?.candidates.map((candidate) => [candidate.id, candidate]) ?? []);

  return (
    <Stack
      spacing={1}
      data-feedback-anchor={`hand:${side}`}
      onClick={selection ? selection.onCancel : undefined}
      sx={selection ? { position: 'relative', zIndex: 1210 } : undefined}
    >
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
        const candidate = selection ? candidateMap.get(member.defId) : undefined;
        const targeting = !!selection;
        const allowed = !!candidate?.allowed;
        const hint = candidate?.warning ?? candidate?.reason ?? (allowed ? '點擊以指定此角色' : '不可指定；點擊取消');
        return (
          <Box
            key={member.defId}
            data-feedback-anchor={`member:${member.defId}`}
            sx={{
              position: 'relative',
              transform: index % 2 ? 'rotate(.25deg)' : 'rotate(-.2deg)',
              opacity: targeting && !allowed ? .32 : 1,
              outline: targeting && allowed ? '4px solid rgba(255,180,59,.95)' : '4px solid transparent',
              outlineOffset: 3,
              borderRadius: 2,
              transition: 'opacity .15s ease, outline-color .15s ease',
            }}
          >
            <CharacterCard
              definition={definition}
              state={member}
              stats={{ design: engine.getEffectiveStat(member.defId, 'design'), text: engine.getEffectiveStat(member.defId, 'text'), aa: engine.getEffectiveStat(member.defId, 'aa') }}
              action={actionChoices?.[member.defId]}
              showActions={showActions}
              onActionChange={(action) => onActionChange?.(member.defId, action)}
              onActivateSkill={onActivateSkill ? (skillId) => onActivateSkill(member.defId, skillId) : undefined}
              canActivateSkill={(skillId) => getSkillAvailability(engine, member.defId, skillId).allowed}
              getSkillDisabledReason={(skillId) => getSkillAvailability(engine, member.defId, skillId).reason}
              compact
            />
            {targeting && (
              <Box
                component="button"
                type="button"
                aria-label={hint}
                title={hint}
                onClick={(event) => {
                  event.stopPropagation();
                  if (allowed) selection.onSelect(member.defId);
                  else selection.onCancel();
                }}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  border: 0,
                  borderRadius: 2,
                  bgcolor: allowed ? 'rgba(255,196,72,.06)' : 'rgba(40,48,62,.08)',
                  cursor: allowed ? 'pointer' : 'default',
                }}
              />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
