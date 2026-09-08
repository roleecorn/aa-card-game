import { Stack, Typography } from '@mui/material';
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
}

export function TeamColumn({
  title,
  team,
  engine,
  showActions,
  actionChoices,
  onActionChange,
  onActivateSkill,
}: Props) {
  return (
    <Stack spacing={1.2}>
      <Typography variant="h6">{title}</Typography>
      {team.members.map((member) => {
        const definition = CHARACTERS[member.defId];
        if (!definition) return null;
        return (
          <CharacterCard
            key={member.defId}
            definition={definition}
            state={member}
            stats={{
              design: engine.getEffectiveStat(member.defId, 'design'),
              text: engine.getEffectiveStat(member.defId, 'text'),
              aa: engine.getEffectiveStat(member.defId, 'aa'),
            }}
            action={actionChoices?.[member.defId]}
            showActions={showActions}
            onActionChange={(action) => onActionChange?.(member.defId, action)}
            onActivateSkill={onActivateSkill ? (skillId) => onActivateSkill(member.defId, skillId) : undefined}
            canActivateSkill={(skillId) => engine.canUseActiveSkill(member.defId, skillId)}
          />
        );
      })}
    </Stack>
  );
}
