import { useCallback, useEffect, useMemo, useState } from 'react';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { selectStandardRosters } from '../game/engine';
import type { WorkType } from '../game/schema';
import type { GameDefinition } from '../game/gameDefinition';
import { persistTeamNameCookie, readTeamNameCookie } from '../preferences/teamName';
import { useGameStore } from '../store/gameStore';
import { CharacterRosterDialog } from '../components/CharacterRosterDialog';
import { OnlineConnectionDialog } from '../components/OnlineConnectionDialog';
import { OnlineDraftScreen } from '../components/OnlineDraftScreen';
import { StartScreen, type TeamSizeOption } from '../components/StartScreen';
import { DrawPhaseScreen } from '../components/DrawPhaseScreen';
import { WorkTypeSelectionScreen } from '../components/WorkTypeSelectionScreen';
import { useOnlineSession } from '../online/onlineSession';
import { BattleRoom } from './BattleRoom';

type AppStage = 'start' | 'draw' | 'work-types' | 'online-draft' | 'online-work-types' | 'battle';

interface AppProps {
  gameDefinition?: GameDefinition;
}

interface DraftRoster {
  player: string[];
  enemy: string[];
  gameDefinition: GameDefinition;
  leaderId?: string;
}

export default function App({ gameDefinition = STANDARD_GAME_DEFINITION }: AppProps) {
  const game = useGameStore((state) => state.game);
  const reset = useGameStore((state) => state.reset);
  const startGame = useGameStore((state) => state.startGame);
  const startTutorial = useGameStore((state) => state.startTutorial);
  const onlineRole = useOnlineSession((state) => state.role);
  const onlineStatus = useOnlineSession((state) => state.status);
  const onlineTeamSize = useOnlineSession((state) => state.teamSize);
  const onlineDraft = useOnlineSession((state) => state.draft);
  const onlineWorkTypeSelections = useOnlineSession((state) => state.workTypeSelections);
  const submitOnlineWorkTypes = useOnlineSession((state) => state.submitWorkTypes);
  const onlineLocalTeamName = useOnlineSession((state) => state.localTeamName);
  const onlineRemoteTeamName = useOnlineSession((state) => state.remoteTeamName);
  const startHostDraft = useOnlineSession((state) => state.startHostDraft);
  const pickDraftCharacter = useOnlineSession((state) => state.pickDraftCharacter);
  const broadcastCurrentGame = useOnlineSession((state) => state.broadcastCurrentGame);
  const disconnectOnline = useOnlineSession((state) => state.disconnect);
  const [teamName, setTeamName] = useState(() => readTeamNameCookie());
  const [rosterOpen, setRosterOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [appStage, setAppStage] = useState<AppStage>('start');
  const [draftRoster, setDraftRoster] = useState<DraftRoster>();
  const [onlineDraftSettled, setOnlineDraftSettled] = useState(false);

  const playableIds = useMemo(() => {
    const excluded = new Set(gameDefinition.roster.excludedCharacterIds);
    return Object.values(gameDefinition.content.characters)
      .filter((character) => !excluded.has(character.id))
      .map((character) => character.id);
  }, [gameDefinition]);

  const confirmTeamName = useCallback((value: string) => {
    const confirmed = persistTeamNameCookie(value);
    setTeamName(confirmed);
    return confirmed;
  }, []);

  useEffect(() => {
    if (!onlineDraft || onlineDraft.status !== 'complete') {
      setOnlineDraftSettled(false);
    }
  }, [onlineDraft]);

  useEffect(() => {
    if (onlineStatus !== 'connected') return;
    if (game) {
      setOnlineOpen(false);
      setAppStage('battle');
      return;
    }
    if (onlineDraft) {
      setOnlineOpen(false);
      setAppStage(onlineDraft.status === 'complete' && onlineDraftSettled ? 'online-work-types' : 'online-draft');
      return;
    }
    if (onlineRole === 'host' && onlineTeamSize) {
      reset();
      startHostDraft(playableIds);
    }
  }, [game, onlineDraft, onlineDraftSettled, onlineRole, onlineStatus, onlineTeamSize, playableIds, reset, startHostDraft]);

  useEffect(() => {
    if (
      onlineRole !== 'host'
      || onlineStatus !== 'connected'
      || !onlineDraft
      || onlineDraft.status !== 'complete'
      || !onlineDraftSettled
      || !onlineWorkTypeSelections.host
      || !onlineWorkTypeSelections.guest
      || game
    ) return;
    const selectedGameDefinition: GameDefinition = {
      ...gameDefinition,
      rules: {
        ...gameDefinition.rules,
        teamSize: onlineDraft.teamSize,
        player: { ...gameDefinition.rules.player, name: onlineLocalTeamName },
        enemy: { ...gameDefinition.rules.enemy, name: onlineRemoteTeamName ?? gameDefinition.rules.enemy.name },
      },
    };
    startGame(
      onlineDraft.hostPicks,
      onlineDraft.guestPicks,
      onlineDraft.hostPicks[0],
      selectedGameDefinition,
      onlineWorkTypeSelections.host,
      onlineWorkTypeSelections.guest,
    );
    broadcastCurrentGame();
  }, [broadcastCurrentGame, game, gameDefinition, onlineDraft, onlineDraftSettled, onlineLocalTeamName, onlineRemoteTeamName, onlineRole, onlineStatus, onlineWorkTypeSelections, startGame]);

  const handleStart = (teamSize: TeamSizeOption, requestedTeamName: string) => {
    if (onlineRole) disconnectOnline();
    reset();
    const confirmedTeamName = confirmTeamName(requestedTeamName);
    const selectedGameDefinition: GameDefinition = {
      ...gameDefinition,
      rules: {
        ...gameDefinition.rules,
        teamSize,
        player: { ...gameDefinition.rules.player, name: confirmedTeamName },
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
    setDraftRoster((current) => current ? { ...current, leaderId } : current);
    setAppStage('work-types');
  };

  const handleConfirmWorkTypes = (selections: Record<string, WorkType>) => {
    if (!draftRoster?.leaderId) return;
    startGame(
      draftRoster.player,
      draftRoster.enemy,
      draftRoster.leaderId,
      draftRoster.gameDefinition,
      selections,
    );
    setAppStage('battle');
  };

  const handleOnlineDraftAnimationSettled = useCallback(() => {
    setOnlineDraftSettled(true);
  }, []);

  const handleRestart = () => {
    if (onlineRole) disconnectOnline();
    reset();
    setDraftRoster(undefined);
    setOnlineDraftSettled(false);
    setAppStage('start');
  };

  const onlineDialog = (
    <OnlineConnectionDialog
      open={onlineOpen}
      onClose={() => setOnlineOpen(false)}
      teamName={teamName}
      onTeamNameChange={setTeamName}
      onTeamNameConfirm={confirmTeamName}
    />
  );

  const startView = (
    <>
      <StartScreen
        teamName={teamName}
        onTeamNameChange={setTeamName}
        onStart={handleStart}
        onStartTutorial={handleStartTutorial}
        onOpenRoster={() => setRosterOpen(true)}
        onOpenOnline={() => setOnlineOpen(true)}
      />
      <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      {onlineDialog}
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
        {onlineDialog}
      </>
    );
  }

  if (appStage === 'work-types' && draftRoster?.leaderId) {
    const workTypeCharacters = draftRoster.player.flatMap((memberId) => {
      const character = draftRoster.gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    return (
      <WorkTypeSelectionScreen
        characters={workTypeCharacters}
        gameDefinition={draftRoster.gameDefinition}
        onConfirm={handleConfirmWorkTypes}
      />
    );
  }

  if (appStage === 'online-draft' && onlineDraft && onlineRole) {
    const draftCharacters = onlineDraft.poolIds.flatMap((memberId) => {
      const character = gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    return (
      <OnlineDraftScreen
        draft={onlineDraft}
        role={onlineRole}
        characters={draftCharacters}
        onPick={(characterId) => pickDraftCharacter(characterId)}
        onAnimationSettled={handleOnlineDraftAnimationSettled}
      />
    );
  }

  if (appStage === 'online-work-types' && onlineDraft && onlineRole) {
    const localIds = onlineRole === 'host' ? onlineDraft.hostPicks : onlineDraft.guestPicks;
    const localCharacters = localIds.flatMap((memberId) => {
      const character = gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    const submitted = onlineRole === 'host'
      ? !!onlineWorkTypeSelections.host
      : !!onlineWorkTypeSelections.guest;
    return (
      <WorkTypeSelectionScreen
        characters={localCharacters}
        gameDefinition={gameDefinition}
        submitted={submitted}
        title="確認連線對局作品類型"
        description="請為自己隊伍的每名角色選擇初始作品類型。雙方都確認後才會建立對局。"
        confirmLabel="送出作品類型"
        onConfirm={(selections) => { submitOnlineWorkTypes(selections); }}
      />
    );
  }

  if (appStage === 'battle' && game) {
    return onlineRole
      ? <BattleRoom key={`online-${game.phase}`} onRestart={handleRestart} />
      : <BattleRoom onRestart={handleRestart} />;
  }

  return startView;
}