import { useCallback, useEffect, useMemo, useState } from 'react';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { selectStandardRosters } from '../game/engine';
import type { GameDefinition } from '../game/gameDefinition';
import { useGameStore } from '../store/gameStore';
import { CharacterRosterDialog } from '../components/CharacterRosterDialog';
import { OnlineConnectionDialog } from '../components/OnlineConnectionDialog';
import { StartScreen, type TeamSizeOption } from '../components/StartScreen';
import { DrawPhaseScreen } from '../components/DrawPhaseScreen';
import { useOnlineSession } from '../online/onlineSession';
import { BattleRoom } from './BattleRoom';

type AppStage = 'start' | 'draw' | 'battle';

interface AppProps {
  gameDefinition?: GameDefinition;
}

interface DraftRoster {
  player: string[];
  enemy: string[];
  gameDefinition: GameDefinition;
}

export default function App({ gameDefinition = STANDARD_GAME_DEFINITION }: AppProps) {
  const game = useGameStore((state) => state.game);
  const reset = useGameStore((state) => state.reset);
  const startGame = useGameStore((state) => state.startGame);
  const startTutorial = useGameStore((state) => state.startTutorial);
  const onlineRole = useOnlineSession((state) => state.role);
  const onlineStatus = useOnlineSession((state) => state.status);
  const broadcastCurrentGame = useOnlineSession((state) => state.broadcastCurrentGame);
  const disconnectOnline = useOnlineSession((state) => state.disconnect);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [appStage, setAppStage] = useState<AppStage>('start');
  const [draftRoster, setDraftRoster] = useState<DraftRoster>();

  const playableIds = useMemo(() => {
    const excluded = new Set(gameDefinition.roster.excludedCharacterIds);
    return Object.values(gameDefinition.content.characters)
      .filter((character) => !excluded.has(character.id))
      .map((character) => character.id);
  }, [gameDefinition]);

  useEffect(() => {
    if (onlineRole === 'guest' && onlineStatus === 'connected' && game) {
      setOnlineOpen(false);
      setAppStage('battle');
    }
  }, [game, onlineRole, onlineStatus]);

  const handleStart = (teamSize: TeamSizeOption) => {
    if (onlineRole === 'guest' && onlineStatus === 'connected') {
      setOnlineOpen(true);
      return;
    }
    reset();
    const selectedGameDefinition: GameDefinition = {
      ...gameDefinition,
      rules: {
        ...gameDefinition.rules,
        teamSize,
      },
    };
    const selected = selectStandardRosters(Math.random, selectedGameDefinition);
    setDraftRoster({
      player: selected.playerMemberIds,
      enemy: selected.enemyMemberIds,
      gameDefinition: selectedGameDefinition,
    });
    setAppStage('draw');
  };

  const handleStartTutorial = () => {
    if (onlineRole) disconnectOnline();
    startTutorial();
    setDraftRoster(undefined);
    setAppStage('battle');
  };

  const handleReroll = useCallback((index: number) => {
    setDraftRoster((current) => {
      if (!current) return current;
      const participants = [...current.player, ...current.enemy];
      const replacementPool = playableIds.filter((id) => !participants.includes(id));
      const replacement = replacementPool[Math.floor(Math.random() * replacementPool.length)];
      if (!replacement) return current;
      const player = [...current.player];
      player[index] = replacement;
      return { ...current, player };
    });
  }, [playableIds]);

  const handleConfirmRoster = (leaderId: string) => {
    if (!draftRoster) return;
    startGame(draftRoster.player, draftRoster.enemy, leaderId, draftRoster.gameDefinition);
    setAppStage('battle');
    if (onlineRole === 'host' && onlineStatus === 'connected') broadcastCurrentGame();
  };

  const handleRestart = () => {
    if (onlineRole) disconnectOnline();
    reset();
    setDraftRoster(undefined);
    setAppStage('start');
  };

  const startView = (
    <>
      <StartScreen
        onStart={handleStart}
        onStartTutorial={handleStartTutorial}
        onOpenRoster={() => setRosterOpen(true)}
        onOpenOnline={() => setOnlineOpen(true)}
      />
      <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      <OnlineConnectionDialog open={onlineOpen} onClose={() => setOnlineOpen(false)} />
    </>
  );

  if (appStage === 'start') return startView;

  if (appStage === 'draw' && draftRoster) {
    const drawnCharacters = draftRoster.player.flatMap((memberId) => {
      const character = draftRoster.gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    return (
      <>
        <DrawPhaseScreen
          characters={drawnCharacters}
          leaderStressBonus={draftRoster.gameDefinition.rules.leaderStressBonus}
          onReroll={handleReroll}
          onConfirm={handleConfirmRoster}
        />
        <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
        <OnlineConnectionDialog open={onlineOpen} onClose={() => setOnlineOpen(false)} />
      </>
    );
  }

  if (appStage === 'battle' && game) {
    return <BattleRoom onRestart={handleRestart} />;
  }

  return startView;
}
