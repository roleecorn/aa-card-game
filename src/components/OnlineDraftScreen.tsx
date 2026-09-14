import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import type { CharacterDefinition } from '../game/schema';
import { draftTurn, type OnlineDraftSide, type OnlineDraftState } from '../online/onlineDraft';
import { CharacterSelectionCard } from './CharacterSelectionCard';

interface Props {
  draft: OnlineDraftState;
  role: OnlineDraftSide;
  characters: CharacterDefinition[];
  onPick: (characterId: string) => void;
}

type RevealPhase = 'dealing' | 'revealing' | 'ready';

export function OnlineDraftScreen({ draft, role, characters, onPick }: Props) {
  const turn = draftTurn(draft);
  const myPicks = role === 'host' ? draft.hostPicks : draft.guestPicks;
  const opponentPicks = role === 'host' ? draft.guestPicks : draft.hostPicks;
  const myTurn = turn?.side === role;
  const characterMap = new Map(characters.map((character) => [character.id, character]));
  const pickedIds = new Set([...draft.hostPicks, ...draft.guestPicks]);
  const availableCharacters = characters.filter((character) => !pickedIds.has(character.id));
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('dealing');
  const [revealCount, setRevealCount] = useState(0);
  const revealReady = revealPhase === 'ready';

  useEffect(() => {
    if (!characters.length) {
      setRevealPhase('ready');
      return;
    }

    if (revealPhase === 'dealing') {
      const timer = window.setTimeout(() => {
        setRevealCount(1);
        setRevealPhase('revealing');
      }, 720);
      return () => window.clearTimeout(timer);
    }

    if (revealPhase !== 'revealing') return;

    if (revealCount < characters.length) {
      const timer = window.setTimeout(
        () => setRevealCount((current) => Math.min(characters.length, current + 1)),
        420,
      );
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setRevealPhase('ready'), 520);
    return () => window.clearTimeout(timer);
  }, [characters.length, revealCount, revealPhase]);

  const skipReveal = () => {
    setRevealCount(characters.length);
    setRevealPhase('ready');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 1.2, md: 2.2, xl: 2.5 },
        py: { xs: 2.2, md: 3.2 },
        bgcolor: '#f7f9fd',
        backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(255,112,152,.09) 0 3px, transparent 4px), radial-gradient(circle at 86% 18%, rgba(79,143,230,.09) 0 3px, transparent 4px)',
        backgroundSize: '92px 92px, 120px 120px',
        overflowX: 'hidden',
      }}
    >
      <Stack alignItems="center" spacing={2.1}>
        <Stack alignItems="center" spacing={.45}>
          <AutoAwesomeRoundedIcon sx={{ color: '#efb33f', fontSize: 30 }} />
          <Typography sx={{ fontSize: { xs: 25, md: 34 }, fontWeight: 950, letterSpacing: '-.03em' }}>
            選擇角色
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: revealReady && myTurn ? 'primary.main' : 'text.secondary', fontWeight: 850 }}>
            {!revealReady
              ? '角色卡將依序揭曉'
              : draft.status === 'complete'
              ? '選角完成，正在準備對局…'
              : myTurn
              ? `輪到你：本輪還可選 ${turn?.remainingInBatch ?? 0} 名角色`
              : `等待對手選擇 ${turn?.remainingInBatch ?? 0} 名角色`}
          </Typography>
        </Stack>

        <Box
          sx={{
            width: 'min(1920px, 100%)',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: '190px minmax(0, 1fr) 190px',
              xl: '230px minmax(0, 1280px) 230px',
            },
            gridTemplateAreas: {
              xs: '"mine" "pool" "rival"',
              lg: '"mine pool rival"',
            },
            justifyContent: 'center',
            alignItems: 'start',
            gap: { xs: 2, lg: 1.6, xl: 2 },
          }}
        >
          <DraftTeamRail
            title="我的隊伍"
            ids={myPicks}
            characterMap={characterMap}
            area="mine"
            tone="mine"
          />

          <Box
            sx={{
              gridArea: 'pool',
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(3, minmax(0, 1fr))',
              },
              gap: { xs: 1.4, md: 1.8, xl: 2.2 },
              minWidth: 0,
            }}
          >
            {availableCharacters.map((character, index) => {
              const available = revealReady && myTurn && draft.status === 'drafting';

              return (
                <CharacterSelectionCard
                  key={character.id}
                  character={character}
                  interactive={available}
                  revealed={revealReady || index < revealCount}
                  dealIndex={index}
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
            tone="rival"
          />
        </Box>

        {!revealReady && (
          <Button variant="text" onClick={skipReveal} sx={{ minWidth: 140, fontWeight: 850 }}>
            跳過抽卡動畫
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function DraftTeamRail({
  title,
  ids,
  characterMap,
  area,
  tone,
}: {
  title: string;
  ids: string[];
  characterMap: Map<string, CharacterDefinition>;
  area: 'mine' | 'rival';
  tone: 'mine' | 'rival';
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
        maxHeight: { lg: 'calc(100vh - 32px)' },
        overflowY: { lg: 'auto' },
        pr: { lg: .35 },
      }}
    >
      <Stack direction="row" spacing={.7} alignItems="center" sx={{ px: .3, minHeight: 28 }}>
        <AutoAwesomeRoundedIcon sx={{ color: tone === 'mine' ? '#efb33f' : '#5ca9e8', fontSize: 18 }} />
        <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 950 }}>{title}</Typography>
      </Stack>

      {ids.map((id) => {
        const character = characterMap.get(id);
        if (!character) return null;
        return (
          <CharacterSelectionCard
            key={id}
            character={character}
            variant="rail"
          />
        );
      })}
    </Stack>
  );
}
