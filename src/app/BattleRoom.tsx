import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import HandshakeIcon from '@mui/icons-material/Handshake';
import CoffeeIcon from '@mui/icons-material/Coffee';
import { CARDS, CHARACTERS, SKILLS } from '../content/catalog';
import { EngineSession } from '../game/engine';
import {
  getCardAvailability,
  getCardMemberCandidates,
  getCardWorkCandidates,
  getDiePlacementLegality,
  getSkillAvailability,
  getSkillSelectionPlan,
  type TargetCandidate,
} from '../game/targeting';
import type { ActionChoice, CardInstance, SkillActivationTarget } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { useOnlineSession } from '../online/onlineSession';
import { GameHeader } from '../components/GameHeader';
import { TeamColumn } from '../components/TeamColumn';
import { WorkBoard } from '../components/WorkBoard';
import { DiceTray } from '../components/DiceTray';
import { CardHand } from '../components/CardHand';
import { CardPlayDialog } from '../components/CardPlayDialog';
import { SkillActivationDialog } from '../components/SkillActivationDialog';
import { ActivationConfirmDialog } from '../components/ActivationConfirmDialog';
import { SelectionBanner } from '../components/SelectionBanner';
import { LogPanel } from '../components/LogPanel';
import { ActionFeedback } from '../components/ActionFeedback';
import { CharacterRosterDialog } from '../components/CharacterRosterDialog';
import { HandLimitDialog } from '../components/HandLimitDialog';
import { TutorialGuide } from '../tutorial/TutorialGuide';

type SelectionMode =
  | { kind: 'die'; dieId: string }
  | { kind: 'card'; instance: CardInstance }
  | { kind: 'skill'; memberId: string; skillId: string; target: SkillActivationTarget };

interface BattleRoomProps {
  onRestart: () => void;
}

const panelSx = {
  p: 1.15,
  border: '1.5px solid #dfe8f4',
  boxShadow: '0 3px 12px rgba(49,74,112,.05)',
  bgcolor: 'rgba(255,255,255,.94)',
};

export function BattleRoom({ onRestart }: BattleRoomProps) {
  const game = useGameStore((state) => state.game);
  const activeGameDefinition = useGameStore((state) => state.gameDefinition);
  const mode = useGameStore((state) => state.mode);
  const tutorial = useGameStore((state) => state.tutorial);
  const actionChoices = useGameStore((state) => state.actionChoices);
  const tutorialEvent = useGameStore((state) => state.tutorialEvent);
  const dismissTutorial = useGameStore((state) => state.dismissTutorial);
  const setActionChoice = useGameStore((state) => state.setActionChoice);
  const performPlayerActions = useGameStore((state) => state.performPlayerActions);
  const performOnlineActions = useGameStore((state) => state.performOnlineActions);
  const placeDie = useGameStore((state) => state.placeDie);
  const finishPlayerAssignment = useGameStore((state) => state.finishPlayerAssignment);
  const finishOnlineAssignment = useGameStore((state) => state.finishOnlineAssignment);
  const playCard = useGameStore((state) => state.playCard);
  const discardCards = useGameStore((state) => state.discardCards);
  const activateSkill = useGameStore((state) => state.activateSkill);
  const onlineRole = useOnlineSession((state) => state.role);
  const onlineStatus = useOnlineSession((state) => state.status);
  const sendCommand = useOnlineSession((state) => state.sendCommand);
  const broadcastCurrentGame = useOnlineSession((state) => state.broadcastCurrentGame);

  const engine = useMemo(
    () => game ? new EngineSession(game, Math.random, activeGameDefinition) : undefined,
    [activeGameDefinition, game],
  );
  const [selectedDieId, setSelectedDieId] = useState<string>();
  const [cardInstance, setCardInstance] = useState<CardInstance>();
  const [skillDialog, setSkillDialog] = useState<{ memberId: string; skillId: string }>();
  const [selectionMode, setSelectionMode] = useState<SelectionMode>();
  const [message, setMessage] = useState<string>();
  const [rosterOpen, setRosterOpen] = useState(false);
  const tutorialStep = tutorial?.step;

  const onlineConnected = onlineStatus === 'connected';
  const onlineActive = onlineRole !== null;
  const onlineGuest = onlineRole === 'guest';
  const onlineHost = onlineRole === 'host';
  const localTurn = game?.phase === 'player-plan' || game?.phase === 'player-assign';
  const waitingForOpponent = game?.phase === 'enemy-plan' || game?.phase === 'enemy-assign';
  const canInteract = !onlineActive || onlineConnected;
  const selectedDie = game?.player.pendingDice.find((die) => die.id === selectedDieId);
  const playerScore = engine?.scoreTeam('player') ?? 0;
  const enemyScore = engine?.scoreTeam('enemy') ?? 0;

  const cancelSelection = useCallback(() => {
    setSelectionMode(undefined);
    setSelectedDieId(undefined);
  }, []);

  useEffect(() => {
    if (!selectionMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      cancelSelection();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelSelection, selectionMode]);

  useEffect(() => {
    if (!waitingForOpponent && game?.phase !== 'finished') return;
    setSelectionMode(undefined);
    setSelectedDieId(undefined);
    setCardInstance(undefined);
    setSkillDialog(undefined);
  }, [game?.phase, waitingForOpponent]);

  const publishHostState = (success: boolean): boolean => {
    if (success && onlineHost) broadcastCurrentGame();
    return success;
  };

  const sendGuestCommand = (command: Parameters<typeof sendCommand>[0]): boolean => {
    if (!onlineConnected) {
      setMessage('連線已中斷，請重開對局。');
      return false;
    }
    const sent = sendCommand(command);
    if (!sent) setMessage('目前無法傳送操作給 Host。');
    return sent;
  };

  const handleActionChange = (memberId: string, action: ActionChoice) => {
    if (!localTurn || !canInteract) return;
    setActionChoice(memberId, action);
    tutorialEvent({ type: 'actionChanged', memberId, action });
  };

  const handlePerformPlayerActions = () => {
    if (!game || game.phase !== 'player-plan' || !canInteract) return;
    if (onlineGuest) {
      if (!sendGuestCommand({ type: 'performActions', actions: actionChoices })) return;
    } else if (onlineHost) {
      if (!publishHostState(performOnlineActions('player', actionChoices))) return;
    } else {
      performPlayerActions();
    }
    cancelSelection();
    tutorialEvent({ type: 'playerActionsPerformed' });
  };

  const handleDieSelect = (dieId: string) => {
    if (!game || !engine || game.phase !== 'player-assign' || !canInteract) return;
    if (selectionMode?.kind === 'die' && selectionMode.dieId === dieId) {
      cancelSelection();
      return;
    }
    const die = game.player.pendingDice.find((candidate) => candidate.id === dieId);
    if (!die) return;
    const hasLegalTarget = game.player.works.some((work) => work.slots.some((_, slotIndex) =>
      getDiePlacementLegality(engine, 'player', die, work, slotIndex).allowed));
    if (!hasLegalTarget) {
      setMessage('這顆骰目前沒有可放置的位置。');
      return;
    }
    setSelectedDieId(dieId);
    setSelectionMode({ kind: 'die', dieId });
    tutorialEvent({ type: 'dieSelected', ownerId: die.ownerId, skill: die.skill });
  };

  const handleSlotClick = (workId: string, slotIndex: number) => {
    if (!selectedDie || !engine || !canInteract) return;
    const work = game?.player.works.find((candidate) => candidate.id === workId);
    if (!work) return;
    const legality = getDiePlacementLegality(engine, 'player', selectedDie, work, slotIndex);
    if (!legality.allowed) {
      cancelSelection();
      return;
    }
    const ok = onlineGuest
      ? sendGuestCommand({ type: 'placeDie', dieId: selectedDie.id, workId, slotIndex })
      : publishHostState(placeDie(selectedDie.id, workId, slotIndex));
    if (ok) {
      tutorialEvent({
        type: 'diePlaced',
        ownerId: selectedDie.ownerId,
        skill: selectedDie.skill,
        workOwnerId: work.ownerId,
      });
      cancelSelection();
    } else {
      cancelSelection();
      setMessage('目前狀態已改變，這顆骰無法放在該位置。');
    }
  };

  const handleOpenCard = (instance: CardInstance) => {
    if (!game || !engine || game.phase === 'finished') return;
    if (onlineActive && (!onlineConnected || !localTurn)) {
      setMessage(onlineConnected ? '等待對手完成回合。' : '連線已中斷，請重開對局。');
      return;
    }
    const availability = getCardAvailability(engine, 'player', instance);
    if (!availability.allowed) {
      setMessage(availability.reason ?? '目前條件不允許使用這張牌。');
      return;
    }
    setCardInstance(instance);
    tutorialEvent({ type: 'cardDialogOpened', cardId: instance.cardId });
  };

  const playLocalCard = (instanceId: string, target: SkillActivationTarget): boolean => {
    if (onlineGuest) return sendGuestCommand({ type: 'playCard', instanceId, target });
    return publishHostState(playCard('player', instanceId, target));
  };

  const handleCardConfirm = (target: SkillActivationTarget) => {
    if (!cardInstance) return;
    const cardId = cardInstance.cardId;
    const ok = playLocalCard(cardInstance.instanceId, target);
    tutorialEvent({ type: 'cardResolved', cardId, success: ok });
    setCardInstance(undefined);
    if (!ok) setMessage('目前條件不允許使用這張牌。');
  };

  const handleBeginCardSelection = () => {
    if (!cardInstance) return;
    const card = CARDS[cardInstance.cardId];
    if (!card) return;
    if (card.target.kind === 'none') {
      handleCardConfirm({});
      return;
    }
    setSelectionMode({ kind: 'card', instance: cardInstance });
    setCardInstance(undefined);
  };

  const handleActivate = (memberId: string, skillId: string) => {
    if (!engine) return;
    if (onlineActive && (!onlineConnected || !localTurn)) {
      setMessage(onlineConnected ? '等待對手完成回合。' : '連線已中斷，請重開對局。');
      return;
    }
    const skill = SKILLS[skillId];
    if (!skill) return;
    const availability = getSkillAvailability(engine, memberId, skillId);
    if (!availability.allowed) {
      setMessage(availability.reason ?? '技能目前不能發動。');
      return;
    }
    setSkillDialog({ memberId, skillId });
    tutorialEvent({ type: 'skillDialogOpened', memberId, skillId });
  };

  const activateLocalSkill = (memberId: string, skillId: string, target: SkillActivationTarget): boolean => {
    if (onlineGuest) return sendGuestCommand({ type: 'activateSkill', memberId, skillId, target });
    return publishHostState(activateSkill('player', memberId, skillId, target));
  };

  const resolveSkill = (memberId: string, skillId: string, target: SkillActivationTarget) => {
    const ok = activateLocalSkill(memberId, skillId, target);
    tutorialEvent({ type: 'skillResolved', memberId, skillId, success: ok });
    setSkillDialog(undefined);
    setSelectionMode(undefined);
    if (!ok) setMessage('技能目前不能發動，請檢查目標與使用次數。');
  };

  const handleSkillConfirm = (target: SkillActivationTarget) => {
    if (!skillDialog) return;
    resolveSkill(skillDialog.memberId, skillDialog.skillId, target);
  };

  const handleBeginSkillSelection = () => {
    if (!skillDialog) return;
    const { memberId, skillId } = skillDialog;
    const skill = SKILLS[skillId];
    if (!skill) return;
    const spec = skill.activeTarget ?? { kind: 'none' as const };
    if (spec.kind === 'none') {
      resolveSkill(memberId, skillId, {});
      return;
    }
    setSelectionMode({ kind: 'skill', memberId, skillId, target: {} });
    setSkillDialog(undefined);
  };

  const handleCardDialogClose = () => {
    tutorialEvent({ type: 'cardDialogClosed', cardId: cardInstance?.cardId });
    setCardInstance(undefined);
  };

  const handleSkillDialogClose = () => {
    tutorialEvent({
      type: 'skillDialogClosed',
      memberId: skillDialog?.memberId,
      skillId: skillDialog?.skillId,
    });
    setSkillDialog(undefined);
  };

  const handleFinishPlayerAssignment = () => {
    if (!game || game.phase !== 'player-assign' || !canInteract) return;
    if (onlineGuest) {
      if (!sendGuestCommand({ type: 'finishAssignment' })) return;
    } else if (onlineHost) {
      if (!publishHostState(finishOnlineAssignment('player'))) return;
    } else {
      finishPlayerAssignment();
    }
    cancelSelection();
    tutorialEvent({ type: 'playerAssignmentFinished' });
  };

  const discardLocalCards = (instanceIds: string[]): boolean => {
    if (onlineGuest) return sendGuestCommand({ type: 'discardCards', instanceIds });
    return publishHostState(discardCards('player', instanceIds));
  };

  if (!game || !engine) return null;

  const pendingCard = cardInstance ? CARDS[cardInstance.cardId] : undefined;
  const pendingSkill = skillDialog ? SKILLS[skillDialog.skillId] : undefined;
  const useLegacyCardDialog = !!pendingCard && (
    mode === 'tutorial'
    || pendingCard.target.kind === 'voiceMode'
    || (pendingCard.target.kind === 'member' && !!pendingCard.target.skillPicker)
  );
  const useLegacySkillDialog = mode === 'tutorial' || pendingSkill?.id === 'grimmBurningFrame';

  let memberCandidates: TargetCandidate[] | undefined;
  let workCandidates: TargetCandidate[] | undefined;
  let dieCandidates: TargetCandidate[] | undefined;
  let selectionTitle = '選擇目標';
  let selectionInstruction = '選擇高亮對象；點擊灰色區域或按 Esc 取消。';

  if (selectionMode?.kind === 'card') {
    const card = CARDS[selectionMode.instance.cardId];
    if (card) {
      selectionTitle = card.name;
      if (card.target.kind === 'member') {
        memberCandidates = getCardMemberCandidates(engine, 'player', card);
        selectionInstruction = '選擇一名高亮角色。灰色角色或其他灰色區域會取消使用。';
      } else if (card.target.kind === 'work') {
        workCandidates = getCardWorkCandidates(engine, 'player', card);
        selectionInstruction = '選擇一個高亮作品。灰色作品或其他灰色區域會取消使用。';
      }
    }
  }

  let skillPlan: ReturnType<typeof getSkillSelectionPlan> | undefined;
  if (selectionMode?.kind === 'skill') {
    const skill = SKILLS[selectionMode.skillId];
    skillPlan = getSkillSelectionPlan(engine, selectionMode.memberId, selectionMode.skillId, selectionMode.target);
    selectionTitle = skill?.name ?? '選擇技能目標';
    if (skillPlan.stage === 'member') {
      memberCandidates = skillPlan.candidates;
      selectionInstruction = '選擇一名高亮角色。灰色角色或其他灰色區域會取消技能。';
    } else if (skillPlan.stage === 'work') {
      workCandidates = skillPlan.candidates;
      selectionInstruction = '選擇一個高亮作品。灰色作品或其他灰色區域會取消技能。';
    } else if (skillPlan.stage === 'sourceDie') {
      dieCandidates = skillPlan.candidates;
      selectionInstruction = 'Step 1/2：選擇一顆高亮來源骰。灰色區域會取消技能。';
    } else if (skillPlan.stage === 'targetDie') {
      dieCandidates = skillPlan.candidates;
      selectionInstruction = selectionMode.target.sourceDieId
        ? 'Step 2/2：選擇一顆高亮目標骰。灰色區域會取消技能。'
        : '選擇一顆高亮骰子。灰色區域會取消技能。';
    }
  }

  if (selectionMode?.kind === 'die') {
    const die = game.player.pendingDice.find((candidate) => candidate.id === selectionMode.dieId);
    selectionTitle = die ? `${CHARACTERS[die.ownerId]?.name ?? die.ownerId} · ${die.skill.toUpperCase()} ${die.value}` : '放置骰子';
    selectionInstruction = '選擇一個高亮進度格。灰色進度格或其他灰色區域會取消放置。';
  }

  const handleMemberSelection = (memberId: string) => {
    if (selectionMode?.kind === 'card') {
      const card = CARDS[selectionMode.instance.cardId];
      if (!card || card.target.kind !== 'member') return;
      const ok = playLocalCard(selectionMode.instance.instanceId, { memberId });
      tutorialEvent({ type: 'cardResolved', cardId: selectionMode.instance.cardId, success: ok });
      setSelectionMode(undefined);
      if (!ok) setMessage('目前狀態已改變，這張牌無法指定該角色。');
      return;
    }
    if (selectionMode?.kind === 'skill') {
      resolveSkill(selectionMode.memberId, selectionMode.skillId, { ...selectionMode.target, memberId });
    }
  };

  const handleWorkSelection = (workId: string) => {
    if (selectionMode?.kind === 'card') {
      const card = CARDS[selectionMode.instance.cardId];
      if (!card || card.target.kind !== 'work') return;
      const ok = playLocalCard(selectionMode.instance.instanceId, { workId });
      tutorialEvent({ type: 'cardResolved', cardId: selectionMode.instance.cardId, success: ok });
      setSelectionMode(undefined);
      if (!ok) setMessage('目前狀態已改變，這張牌無法指定該作品。');
      return;
    }
    if (selectionMode?.kind === 'skill') {
      resolveSkill(selectionMode.memberId, selectionMode.skillId, { ...selectionMode.target, workId });
    }
  };

  const handleSkillDieSelection = (dieId: string) => {
    if (selectionMode?.kind !== 'skill' || !skillPlan) return;
    if (skillPlan.stage === 'sourceDie') {
      setSelectionMode({ ...selectionMode, target: { ...selectionMode.target, sourceDieId: dieId } });
      return;
    }
    if (skillPlan.stage === 'targetDie') {
      resolveSkill(selectionMode.memberId, selectionMode.skillId, { ...selectionMode.target, targetDieId: dieId });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: 'radial-gradient(circle at 10% 12%, rgba(255,190,73,.08) 0 3px, transparent 4px), radial-gradient(circle at 91% 18%, rgba(88,164,235,.08) 0 3px, transparent 4px)',
        backgroundSize: '86px 86px, 110px 110px',
      }}
    >
      <GameHeader
        game={game}
        playerScore={playerScore}
        enemyScore={enemyScore}
        onOpenRoster={() => setRosterOpen(true)}
        onReset={onRestart}
      />

      {selectionMode && (
        <>
          <Box
            aria-label="取消目標選擇"
            onClick={cancelSelection}
            sx={{ position: 'fixed', inset: 0, zIndex: 1100, bgcolor: 'rgba(25,32,44,.58)' }}
          />
          <SelectionBanner title={selectionTitle} instruction={selectionInstruction} onCancel={cancelSelection} />
        </>
      )}

      <Container maxWidth={false} sx={{ maxWidth: 1920, pt: 1.4, pb: 'calc(160px + env(safe-area-inset-bottom))', px: { xs: 1.5, md: 2 }, '& [data-battle-section]': { scrollMarginTop: 120 } }}>
        {onlineActive && !onlineConnected && (
          <Alert severity="error" sx={{ mb: 1.2 }}>連線已中斷。為避免兩邊狀態分歧，目前操作已停用；請重開對局。</Alert>
        )}
        {onlineConnected && waitingForOpponent && (
          <Alert severity="info" sx={{ mb: 1.2 }}>等待對手完成目前回合。</Alert>
        )}
        <ActionFeedback events={game.feedback} />
        {game.phase === 'finished' && (
          <Alert severity={game.winner === 'player' ? 'success' : game.winner === 'draw' ? 'info' : 'warning'} sx={{ mb: 1.2 }}>
            遊戲結束：{game.winner === 'player' ? '我方勝利' : game.winner === 'enemy' ? '對手勝利' : '平手'}。比分 {playerScore} : {enemyScore}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '300px minmax(0,1fr)', xl: '300px minmax(0,1fr) 300px' }, gap: 1.5, alignItems: 'start' }}>
          <Box id="battle-team" data-battle-section sx={{ minWidth: 0 }}>
          <TeamColumn
            title="我方創作小隊"
            side="player"
            team={game.player}
            engine={engine}
            showActions={game.phase === 'player-plan' && canInteract}
            actionChoices={actionChoices}
            onActionChange={handleActionChange}
            onActivateSkill={localTurn && canInteract ? handleActivate : undefined}
            selection={memberCandidates ? { candidates: memberCandidates, onSelect: handleMemberSelection, onCancel: cancelSelection } : undefined}
          />
          </Box>

          <Stack spacing={1.05} sx={{ minWidth: 0 }}>
            <Paper id="battle-works" data-battle-section sx={{ ...panelSx, py: .75, borderColor: '#ff9ab5', bgcolor: '#fff8fa' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={.8}>
                <Stack direction="row" spacing={.75} alignItems="center">
                  <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#fff', border: '1.5px solid #ffc0d0', display: 'grid', placeItems: 'center', transform: 'rotate(-5deg)' }}>
                    <FavoriteBorderIcon sx={{ color: '#ff7098', fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 16.5, fontWeight: 950, lineHeight: 1 }}>進行中的作品</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Works in Progress · Design → Text → AA</Typography>
                  </Box>
                </Stack>
                {game.phase === 'player-plan' && canInteract && (
                  <Button data-tutorial="perform-work" color="secondary" variant="contained" startIcon={<CasinoIcon />} onClick={handlePerformPlayerActions}>
                    進行創作
                  </Button>
                )}
                {game.phase === 'player-assign' && canInteract && (
                  <Button data-tutorial="end-turn" color="warning" variant="contained" startIcon={<SkipNextIcon />} onClick={handleFinishPlayerAssignment}>
                    結束回合
                  </Button>
                )}
              </Stack>
            </Paper>

            <WorkBoard
              works={game.player.works}
              selectedDie={selectedDie}
              onSlotClick={game.phase === 'player-assign' && canInteract ? handleSlotClick : undefined}
              workSelection={workCandidates ? { candidates: workCandidates, onSelect: handleWorkSelection, onCancel: cancelSelection } : undefined}
              slotSelection={selectionMode?.kind === 'die' && selectedDie ? {
                getLegality: (work, slotIndex) => getDiePlacementLegality(engine, 'player', selectedDie, work, slotIndex),
                onSelect: handleSlotClick,
                onCancel: cancelSelection,
              } : undefined}
            />

            <Paper id="battle-dice" data-battle-section sx={panelSx}>
              <Stack direction="row" alignItems="center" spacing={.7} sx={{ mb: .75 }}>
                <AutoAwesomeIcon sx={{ color: '#f4ba45', fontSize: 19 }} />
                <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>本回合骰子</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Dice</Typography>
              </Stack>
              <DiceTray
                dice={game.player.pendingDice}
                selectedDieId={selectedDieId}
                onSelect={game.phase === 'player-assign' && canInteract ? handleDieSelect : undefined}
                selection={dieCandidates ? { candidates: dieCandidates, onSelect: handleSkillDieSelection, onCancel: cancelSelection } : undefined}
              />
            </Paper>

            <Paper data-feedback-anchor="works:enemy" sx={{ ...panelSx, py: .75, borderColor: '#8abfe8', bgcolor: '#f7fbff' }}>
              <Stack direction="row" spacing={.75} alignItems="center">
                <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#fff', border: '1.5px solid #b9d9f2', display: 'grid', placeItems: 'center', transform: 'rotate(4deg)' }}>
                  <FavoriteBorderIcon sx={{ color: '#5ca9e8', fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 16.5, fontWeight: 950, lineHeight: 1 }}>對手小隊作品</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Rival Works · Design → Text → AA</Typography>
                </Box>
              </Stack>
            </Paper>

            <WorkBoard
              works={game.enemy.works}
              workSelection={workCandidates ? { candidates: workCandidates, onSelect: handleWorkSelection, onCancel: cancelSelection } : undefined}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 1.05 }}>
              <Paper id="battle-hand" data-battle-section sx={{ ...panelSx, minWidth: 0 }} data-feedback-anchor="hand:player">
                <Stack direction="row" spacing={.7} alignItems="center" sx={{ mb: .7 }}>
                  <HandshakeIcon sx={{ color: '#3bb8a5', fontSize: 19 }} />
                  <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>我的手牌</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Hand Cards · {game.player.hand.length}</Typography>
                </Stack>
                <CardHand
                  hand={game.player.hand}
                  onPlay={handleOpenCard}
                  getDisabledReason={mode === 'tutorial' ? undefined : (instance) => {
                    if (onlineActive && (!onlineConnected || !localTurn)) {
                      return onlineConnected ? '等待對手完成回合。' : '連線已中斷。';
                    }
                    const availability = getCardAvailability(engine, 'player', instance);
                    return availability.allowed ? undefined : availability.reason;
                  }}
                />
              </Paper>

              <Paper sx={{ ...panelSx, bgcolor: '#fffef9' }}>
                <Typography sx={{ fontSize: 15.5, fontWeight: 950, mb: .7 }}>行動選擇</Typography>
                <Stack spacing={.7}>
                  <ActionHint color="#ff7098" icon={<CasinoIcon />} title="進行創作" subtitle="Work" />
                  <ActionHint color="#57a8eb" icon={<HandshakeIcon />} title="使用支援" subtitle="Support" />
                  <ActionHint color="#9b80dc" icon={<CoffeeIcon />} title="偷偷懶" subtitle="Slack Off" />
                </Stack>
              </Paper>
            </Box>

            <LogPanel logs={game.logs} />
          </Stack>

          <Box id="battle-opponent" data-battle-section sx={{ minWidth: 0, gridColumn: { lg: '1 / -1', xl: 'auto' } }}>
          <TeamColumn
            title="對手創作小隊"
            side="enemy"
            team={game.enemy}
            engine={engine}
            selection={memberCandidates ? { candidates: memberCandidates, onSelect: handleMemberSelection, onCancel: cancelSelection } : undefined}
          />
          </Box>
        </Box>
      </Container>

      <Paper component="nav" aria-label="對局區域導覽" square sx={{
        display: { xs: 'flex', xl: selectionMode ? 'flex' : 'none' },
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1250,
        justifyContent: 'center', gap: .25, px: .5, pt: .5,
        pb: 'calc(4px + env(safe-area-inset-bottom))', borderTop: '1px solid', borderColor: 'divider',
      }}>
        {[
          ['team', '我方'], ['works', '作品'], ['dice', '骰子'], ['hand', '手牌'], ['opponent', '對手'],
        ].map(([section, label]) => (
          <Button key={section} size="small" sx={{ minWidth: 0, minHeight: 48, flex: 1, maxWidth: 120 }} onClick={() => {
            document.getElementById(`battle-${section}`)?.scrollIntoView({ block: 'start' });
          }}>{label}</Button>
        ))}
      </Paper>

      <HandLimitDialog hand={game.player.hand} onDiscard={(instanceIds) => discardLocalCards(instanceIds)} />

      {useLegacyCardDialog ? (
        <CardPlayDialog open={!!cardInstance} cardInstance={cardInstance} game={game} onClose={handleCardDialogClose} onConfirm={handleCardConfirm} />
      ) : pendingCard && cardInstance ? (
        <ActivationConfirmDialog
          open
          title={pendingCard.name}
          description={pendingCard.description}
          confirmLabel={pendingCard.target.kind === 'none' ? '發動' : '選擇目標'}
          onClose={handleCardDialogClose}
          onConfirm={handleBeginCardSelection}
        />
      ) : null}

      {useLegacySkillDialog ? (
        <SkillActivationDialog open={!!skillDialog} memberId={skillDialog?.memberId} skillId={skillDialog?.skillId} game={game} onClose={handleSkillDialogClose} onConfirm={handleSkillConfirm} />
      ) : pendingSkill && skillDialog ? (
        <ActivationConfirmDialog
          open
          title={`${CHARACTERS[skillDialog.memberId]?.name ?? skillDialog.memberId}｜${pendingSkill.name}`}
          description={pendingSkill.description}
          hint={pendingSkill.activeHint}
          confirmLabel={(pendingSkill.activeTarget?.kind ?? 'none') === 'none' ? '發動' : '選擇目標'}
          onClose={handleSkillDialogClose}
          onConfirm={handleBeginSkillSelection}
        />
      ) : null}

      <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      {mode === 'tutorial' && tutorialStep && <TutorialGuide step={tutorialStep} onDismiss={dismissTutorial} />}
      <Snackbar open={!!message} autoHideDuration={3500} onClose={() => setMessage(undefined)}>
        <Alert severity="info" onClose={() => setMessage(undefined)}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}

function ActionHint({ color, icon, title, subtitle }: { color: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Paper variant="outlined" sx={{ p: .65, borderColor: color, bgcolor: `${color}0f`, boxShadow: 'none' }}>
      <Stack direction="row" spacing={.75} alignItems="center">
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 900, lineHeight: 1 }}>{title}</Typography>
          <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700 }}>{subtitle}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
