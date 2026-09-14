import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
type DraftArea = 'mine' | 'rival';

interface PickAnimation {
  id: string;
  side: OnlineDraftSide;
}

interface RectSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FlyingPick extends PickAnimation {
  character: CharacterDefinition;
  targetArea: DraftArea;
  from: RectSnapshot;
  to: RectSnapshot;
  moving: boolean;
}

function snapshotRect(node: HTMLElement): RectSnapshot {
  const rect = node.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function OnlineDraftScreen({ draft, role, characters, onPick }: Props) {
  const turn = draftTurn(draft);
  const myPicks = role === 'host' ? draft.hostPicks : draft.guestPicks;
  const opponentPicks = role === 'host' ? draft.guestPicks : draft.hostPicks;
  const myTurn = turn?.side === role;
  const characterMap = new Map(characters.map((character) => [character.id, character]));
  const pickedIds = new Set([...draft.hostPicks, ...draft.guestPicks]);
  const [hiddenPickedIds, setHiddenPickedIds] = useState<Set<string>>(
    () => new Set([...draft.hostPicks, ...draft.guestPicks]),
  );
  const availableCharacters = characters.filter((character) => !hiddenPickedIds.has(character.id));
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('dealing');
  const [revealCount, setRevealCount] = useState(0);
  const [pendingAnimations, setPendingAnimations] = useState<PickAnimation[]>([]);
  const [flyingPick, setFlyingPick] = useState<FlyingPick | null>(null);
  const [landingId, setLandingId] = useState<string | null>(null);
  const revealReady = revealPhase === 'ready';
  const previousPicksRef = useRef({ host: [...draft.hostPicks], guest: [...draft.guestPicks] });
  const candidateRefs = useRef(new Map<string, HTMLDivElement>());
  const railRefs = useRef(new Map<string, HTMLDivElement>());
  const animationBusy = !!flyingPick || pendingAnimations.length > 0 || [...pickedIds].some((id) => !hiddenPickedIds.has(id));

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

  useEffect(() => {
    const previous = previousPicksRef.current;
    const previousHost = new Set(previous.host);
    const previousGuest = new Set(previous.guest);
    const additions: PickAnimation[] = [
      ...draft.hostPicks.filter((id) => !previousHost.has(id)).map((id) => ({ id, side: 'host' as const })),
      ...draft.guestPicks.filter((id) => !previousGuest.has(id)).map((id) => ({ id, side: 'guest' as const })),
    ];

    previousPicksRef.current = { host: [...draft.hostPicks], guest: [...draft.guestPicks] };
    if (additions.length) {
      setPendingAnimations((current) => [...current, ...additions]);
    }
  }, [draft.hostPicks, draft.guestPicks]);

  useEffect(() => {
    if (flyingPick || !pendingAnimations.length) return;

    const next = pendingAnimations[0]!;
    const sourceNode = candidateRefs.current.get(next.id);
    const targetNode = railRefs.current.get(next.id);
    const character = characterMap.get(next.id);

    if (!sourceNode || !targetNode || !character) {
      setHiddenPickedIds((current) => new Set(current).add(next.id));
      setPendingAnimations((current) => current.slice(1));
      return;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) {
      setHiddenPickedIds((current) => new Set(current).add(next.id));
      setLandingId(next.id);
      setPendingAnimations((current) => current.slice(1));
      return;
    }

    setFlyingPick({
      ...next,
      character,
      targetArea: next.side === role ? 'mine' : 'rival',
      from: snapshotRect(sourceNode),
      to: snapshotRect(targetNode),
      moving: false,
    });
    setPendingAnimations((current) => current.slice(1));
  }, [characterMap, flyingPick, pendingAnimations, role]);

  useEffect(() => {
    if (!flyingPick || flyingPick.moving) return;
    const timer = window.setTimeout(() => {
      setFlyingPick((current) => current && current.id === flyingPick.id ? { ...current, moving: true } : current);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [flyingPick]);

  useEffect(() => {
    if (!flyingPick?.moving) return;
    const id = flyingPick.id;
    const timer = window.setTimeout(() => {
      setHiddenPickedIds((current) => new Set(current).add(id));
      setLandingId(id);
      setFlyingPick((current) => current?.id === id ? null : current);
    }, 560);
    return () => window.clearTimeout(timer);
  }, [flyingPick]);

  useEffect(() => {
    if (!landingId) return;
    const timer = window.setTimeout(() => setLandingId((current) => current === landingId ? null : current), 520);
    return () => window.clearTimeout(timer);
  }, [landingId]);

  const skipReveal = () => {
    setRevealCount(characters.length);
    setRevealPhase('ready');
  };

  const registerCandidateRef = (id: string, node: HTMLDivElement | null) => {
    if (node) candidateRefs.current.set(id, node);
    else candidateRefs.current.delete(id);
  };

  const registerRailRef = (id: string, node: HTMLDivElement | null) => {
    if (node) railRefs.current.set(id, node);
    else railRefs.current.delete(id);
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
            hiddenPickedIds={hiddenPickedIds}
            landingId={landingId}
            registerRailRef={registerRailRef}
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
              const movingOut = pickedIds.has(character.id) && !hiddenPickedIds.has(character.id);
              const pickedSide: OnlineDraftSide | null = draft.hostPicks.includes(character.id)
                ? 'host'
                : draft.guestPicks.includes(character.id)
                ? 'guest'
                : null;
              const available = revealReady
                && !animationBusy
                && !movingOut
                && myTurn
                && draft.status === 'drafting';
              const hideSource = flyingPick?.id === character.id && flyingPick.moving;

              return (
                <Box
                  key={character.id}
                  ref={(node: HTMLDivElement | null) => registerCandidateRef(character.id, node)}
                  sx={{
                    opacity: hideSource ? 0 : 1,
                    transition: 'opacity 120ms ease',
                  }}
                >
                  <CharacterSelectionCard
                    character={character}
                    selected={movingOut}
                    selectedLabel={pickedSide === role ? '我方選擇' : '對手選擇'}
                    interactive={available}
                    revealed={revealReady || index < revealCount}
                    dealIndex={index}
                    onClick={() => onPick(character.id)}
                  />
                </Box>
              );
            })}
          </Box>

          <DraftTeamRail
            title="對手隊伍"
            ids={opponentPicks}
            characterMap={characterMap}
            area="rival"
            tone="rival"
            hiddenPickedIds={hiddenPickedIds}
            landingId={landingId}
            registerRailRef={registerRailRef}
          />
        </Box>

        {!revealReady && (
          <Button variant="text" onClick={skipReveal} sx={{ minWidth: 140, fontWeight: 850 }}>
            跳過抽卡動畫
          </Button>
        )}
      </Stack>

      {flyingPick && typeof document !== 'undefined' && createPortal(
        <FlyingCharacterCard pick={flyingPick} role={role} />,
        document.body,
      )}
    </Box>
  );
}

function FlyingCharacterCard({ pick, role }: { pick: FlyingPick; role: OnlineDraftSide }) {
  const dx = pick.to.left - pick.from.left;
  const dy = pick.to.top - pick.from.top;
  const scale = Math.max(.32, Math.min(1, pick.to.width / Math.max(1, pick.from.width)));

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        left: pick.from.left,
        top: pick.from.top,
        width: pick.from.width,
        zIndex: 1800,
        pointerEvents: 'none',
        transformOrigin: 'top left',
        transform: pick.moving
          ? `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`
          : 'translate3d(0, 0, 0) scale(1.025)',
        filter: pick.moving
          ? 'drop-shadow(0 18px 22px rgba(31,48,78,.24))'
          : 'drop-shadow(0 0 16px rgba(255,112,152,.42))',
        transition: pick.moving
          ? 'transform 560ms cubic-bezier(.2,.8,.2,1), filter 560ms ease'
          : 'transform 120ms ease-out, filter 120ms ease-out',
        willChange: 'transform',
      }}
    >
      <CharacterSelectionCard
        character={pick.character}
        selected
        selectedLabel={pick.side === role ? '我方選擇' : '對手選擇'}
        revealed
      />
    </Box>
  );
}

function DraftTeamRail({
  title,
  ids,
  characterMap,
  area,
  tone,
  hiddenPickedIds,
  landingId,
  registerRailRef,
}: {
  title: string;
  ids: string[];
  characterMap: Map<string, CharacterDefinition>;
  area: DraftArea;
  tone: DraftArea;
  hiddenPickedIds: Set<string>;
  landingId: string | null;
  registerRailRef: (id: string, node: HTMLDivElement | null) => void;
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
        const landed = landingId === id;
        return (
          <Box
            key={id}
            ref={(node: HTMLDivElement | null) => registerRailRef(id, node)}
            sx={{
              opacity: hiddenPickedIds.has(id) ? 1 : 0,
              transform: landed ? 'scale(1.035)' : 'scale(1)',
              filter: landed ? 'drop-shadow(0 0 14px rgba(255,112,152,.42))' : 'none',
              transition: 'opacity 140ms ease, transform 220ms ease, filter 220ms ease',
              transformOrigin: area === 'mine' ? 'left center' : 'right center',
            }}
          >
            <CharacterSelectionCard
              character={character}
              variant="rail"
            />
          </Box>
        );
      })}
    </Stack>
  );
}
