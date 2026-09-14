import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { CharacterDefinition } from '../game/schema';
import { draftTurn, type OnlineDraftSide, type OnlineDraftState } from '../online/onlineDraft';
import { CharacterAffinities } from './CharacterAffinities';

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f9fd', px: { xs: 1.2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.2} alignItems="center">
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 950 }}>連線對戰 · 選擇角色</Typography>
          <Typography sx={{ mt: .7, color: 'text.secondary', fontWeight: 750 }}>
            {draft.teamSize} 人模式 · 候選 {draft.poolIds.length} 名角色 · 雙方第一位選到的角色會成為組長
          </Typography>
          <Typography sx={{ mt: .9, fontSize: { xs: 15, md: 17 }, fontWeight: 950, color: myTurn ? 'primary.main' : 'text.secondary' }}>
            {draft.status === 'complete'
              ? '選角完成，正在準備對局…'
              : myTurn
              ? `輪到你：本輪還可選 ${turn?.remainingInBatch ?? 0} 名角色`
              : `等待對手選擇 ${turn?.remainingInBatch ?? 0} 名角色`}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ width: 'min(1180px, 100%)' }}>
          <PickSummary title="我的隊伍" ids={myPicks} characters={characters} />
          <PickSummary title="對手隊伍" ids={opponentPicks} characters={characters} />
        </Stack>

        <Box
          sx={{
            width: 'min(1380px, 100%)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: draft.teamSize === 5 ? 'repeat(5, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))' },
            gap: 1.5,
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
              <Paper
                key={character.id}
                onClick={() => available && onPick(character.id)}
                sx={{
                  overflow: 'hidden',
                  border: mine ? '3px solid' : pickedBy ? '2px solid' : '2px solid',
                  borderColor: mine ? 'primary.main' : pickedBy ? 'divider' : available ? 'secondary.light' : 'divider',
                  opacity: pickedBy && !mine ? .52 : 1,
                  cursor: available ? 'pointer' : 'default',
                  transition: 'transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease',
                  '&:hover': available ? { transform: 'translateY(-3px)', boxShadow: 5 } : undefined,
                }}
              >
                <Box sx={{ position: 'relative', height: 210, bgcolor: '#eaf0f7' }}>
                  <Box
                    component="img"
                    src={character.portrait}
                    alt={character.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: character.portraitPosition ? `${character.portraitPosition.x}% ${character.portraitPosition.y}%` : 'center 20%' }}
                  />
                  {pickedBy && (
                    <Chip
                      label={mine ? '我方已選' : '對手已選'}
                      color={mine ? 'primary' : 'default'}
                      sx={{ position: 'absolute', top: 10, right: 10, fontWeight: 900 }}
                    />
                  )}
                </Box>
                <Stack spacing={1} sx={{ p: 1.4 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 950 }}>{character.name}</Typography>
                  <Stack direction="row" spacing={.7} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`Design ${character.stats.design}`} />
                    <Chip size="small" label={`Text ${character.stats.text}`} />
                    <Chip size="small" label={`AA ${character.stats.aa}`} />
                  </Stack>
                  <CharacterAffinities affinities={character.affinities} />
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </Stack>
    </Box>
  );
}

function PickSummary({ title, ids, characters }: { title: string; ids: string[]; characters: CharacterDefinition[] }) {
  const names = ids.map((id) => characters.find((character) => character.id === id)?.name ?? id);
  return (
    <Paper variant="outlined" sx={{ flex: 1, p: 1.2 }}>
      <Typography sx={{ fontWeight: 900 }}>{title}</Typography>
      <Typography sx={{ mt: .4, color: names.length ? 'text.primary' : 'text.secondary', fontSize: 13.5 }}>
        {names.length ? names.join('、') : '尚未選擇'}
      </Typography>
    </Paper>
  );
}
