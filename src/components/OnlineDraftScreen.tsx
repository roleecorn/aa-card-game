import { Box, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { CharacterDefinition } from '../game/schema';
import type { CharacterState } from '../game/types';
import { draftTurn, type OnlineDraftSide, type OnlineDraftState } from '../online/onlineDraft';
import { CharacterCard } from './CharacterCard';
import { CharacterSelectionCard } from './CharacterSelectionCard';

interface Props {
  draft: OnlineDraftState;
  role: OnlineDraftSide;
  characters: CharacterDefinition[];
  onPick: (characterId: string) => void;
}

export function OnlineDraftScreen({ draft, role, characters, onPick }: Props) {
  const turn = draftTurn(draft);
  const myPicks = role === 'host' ? draft.hostPicks : draft.guestPicks;
  const opponentPicks = role === 'host' ? draft.guestPicks : draft.hostPicks;
  const myTurn = turn?.side === role;
  const characterMap = new Map(characters.map((character) => [character.id, character]));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f7f9fd',
        px: { xs: 1.2, md: 2, xl: 3 },
        py: { xs: 2, md: 3 },
        backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(255,112,152,.07) 0 3px, transparent 4px), radial-gradient(circle at 86% 18%, rgba(79,143,230,.07) 0 3px, transparent 4px)',
        backgroundSize: '92px 92px, 120px 120px',
      }}
    >
      <Stack spacing={2.2} alignItems="center">
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 950 }}>連線對戰 · 選擇角色</Typography>
          <Typography sx={{ mt: .8, fontSize: { xs: 15, md: 17 }, fontWeight: 950, color: myTurn ? 'primary.main' : 'text.secondary' }}>
            {draft.status === 'complete'
              ? '選角完成，正在準備對局…'
              : myTurn
              ? `輪到你：本輪還可選 ${turn?.remainingInBatch ?? 0} 名角色`
              : `等待對手選擇 ${turn?.remainingInBatch ?? 0} 名角色`}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 'min(1840px, 100%)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr) 280px', xl: '300px minmax(0, 1fr) 300px' },
            gridTemplateAreas: {
              xs: '"mine" "pool" "rival"',
              lg: '"mine pool rival"',
            },
            alignItems: 'start',
            gap: { xs: 2, lg: 2.2 },
          }}
        >
          <DraftTeamRail
            title="我的隊伍"
            ids={myPicks}
            characterMap={characterMap}
            area="mine"
            side="player"
          />

          <Box
            sx={{
              gridArea: 'pool',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: { xs: 1.4, md: 1.8 },
              minWidth: 0,
            }}
          >
            {characters.map((character) => {
              const pickedBy = draft.hostPicks.includes(character.id)
                ? 'host'
                : draft.guestPicks.includes(character.id)
                ? 'guest'
                : null;
              const mine = pickedBy === role;
              const available = !pickedBy && myTurn && draft.status === 'drafting';

              return (
                <CharacterSelectionCard
                  key={character.id}
                  character={character}
                  selected={!!pickedBy}
                  selectedLabel={mine ? '我方已選' : '對手已選'}
                  interactive={available}
                  dimmed={!!pickedBy && !mine}
                  onClick={() => onPick(character.id)}
                />
              );
            })}
          </Box>

          <DraftTeamRail
            title="對手隊伍"
            ids={opponentPicks}
            characterMap={characterMap}
            area="rival"
            side="enemy"
          />
        </Box>
      </Stack>
    </Box>
  );
}

function DraftTeamRail({
  title,
  ids,
  characterMap,
  area,
  side,
}: {
  title: string;
  ids: string[];
  characterMap: Map<string, CharacterDefinition>;
  area: 'mine' | 'rival';
  side: 'player' | 'enemy';
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        gridArea: area,
        minWidth: 0,
        position: { lg: 'sticky' },
        top: { lg: 16 },
        alignSelf: 'start',
      }}
    >
      <Stack direction="row" spacing={.7} alignItems="center" sx={{ px: .3, minHeight: 28 }}>
        <AutoAwesomeIcon sx={{ color: side === 'player' ? '#f4ba45' : '#5ca9e8', fontSize: 19 }} />
        <Typography variant="h6" sx={{ fontSize: 17 }}>{title}</Typography>
      </Stack>

      {ids.map((id) => {
        const character = characterMap.get(id);
        if (!character) return null;
        return (
          <CharacterCard
            key={id}
            definition={character}
            state={previewCharacterState(character)}
            stats={character.stats}
            compact
          />
        );
      })}
    </Stack>
  );
}

function previewCharacterState(character: CharacterDefinition): CharacterState {
  return {
    defId: character.id,
    stress: 0,
    permanentStats: { ...character.stats },
    timedStatModifiers: [],
    skillUsage: {},
    statuses: {},
    resources: character.resource
      ? { [character.resource.name]: character.resource.initial }
      : undefined,
  };
}
