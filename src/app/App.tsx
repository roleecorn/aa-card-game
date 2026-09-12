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
import { CARDS, CHARACTERS, SKILLS, STANDARD_GAME_DEFINITION } from '../content/catalog';
import { EngineSession, selectStandardRosters } from '../game/engine';
import type { GameDefinition } from '../game/gameDefinition';
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
import { StartScreen } from '../components/StartScreen';
import { DrawPhaseScreen } from '../components/DrawPhaseScreen';
import { HandLimitDialog } from '../components/HandLimitDialog';
import { TutorialGuide } from '../tutorial/TutorialGuide';

type AppStage = 'start' | 'draw' | 'battle';

type SelectionMode =
  | { kind: 'die'; dieId: string }
  | { kind: 'card'; instance: CardInstance }
  | { kind: 'skill'; memberId: string; skillId: string; target: SkillActivationTarget };

interface AppProps {
  gameDefinition?: GameDefinition;
}

const panelSx = {
  p: 1.15,
  border: '1.5px solid #dfe8f4',
  boxShadow: '0 3px 12px rgba(49,74,112,.05)',
  bgcolor: 'rgba(255,255,255,.94)',
};

export default function App({ gameDefinition = STANDARD_GAME_DEFINITION }: AppProps) {
  const game = useGameStore((state) => state.game);
  const activeGameDefinition = useGameStore((state) => state.gameDefinition);
  const mode = useGameStore((state) => state.mode);
  const tutorial = useGameStore((state) => state.tutorial);
  const actionChoices = useGameStore((state) => state.actionChoices);
  const reset = useGameStore((state) => state.reset);
  const startGame = useGameStore((state) => state.startGame);
  const startTutorial = useGameStore((state) => state.startTutorial);
  const tutorialEvent = useGameStore((state) => state.tutorialEvent);
  const dismissTutorial = useGameStore((state) => state.dismissTutorial);
  const setActionChoice = useGameStore((state) => state.setActionChoice);
  const performPlayerActions = useGameStore((state) => state.performPlayerActions);
  const placeDie = useGameStore((state) => state.placeDie);
  const finishPlayerAssignment = useGameStore((state) => state.finishPlayerAssignment);
  const playCard = useGameStore((state) => state.playCard);
  const discardCards = useGameStore((state) => state.discardCards);
  const activateSkill = useGameStore((state) => state.activateSkill);

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
  const [appStage, setAppStage] = useState<AppStage>('start');
  const [draftRoster, setDraftRoster] = useState<{ player: string[]; enemy: string[] }>();
  const tutorialStep = tutorial?.step;

  const selectedDie = game?.player.pendingDice.find((die) => die.id === selectedDieId);
  const playerScore = engine?.scoreTeam('player') ?? 0;
  const enemyScore = engine?.scoreTeam('enemy') ?? 0;

  const playableIds = useMemo(() => {
    const excluded = new Set(gameDefinition.roster.excludedCharacterIds);
    return Object.values(gameDefinition.content.characters)
      .filter((character) => !excluded.has(character.id))
      .map((character) => character.id);
  }, [gameDefinition]);

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

  const clearTransientUi = () => {
    setSelectedDieId(undefined);
    setCardInstance(undefined);
    setSkillDialog(undefined);
    setSelectionMode(undefined);
    setMessage(undefined);
  };

  const handleStart = () => {
    reset();
    const selected = selectStandardRosters(Math.random, gameDefinition);
    setDraftRoster({
      player: selected.playerMemberIds,
      enemy: selected.enemyMemberIds,
    });
    clearTransientUi();
    setAppStage('draw');
  };

  const handleStartTutorial = () => {
    startTutorial();
    setDraftRoster(undefined);
    clearTransientUi();
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
      return { player, enemy: current.enemy };
    });
  }, [playableIds]);

  const handleConfirmRoster = (leaderId: string) => {
    if (!draftRoster) return;
    startGame(draftRoster.player, draftRoster.enemy, leaderId, gameDefinition);
    setAppStage('battle');
  };

  const handleRestart = () => {
    reset();
    setDraftRoster(undefined);
    clearTransientUi();
    setAppStage('start');
  };

  const handleActionChange = (memberId: string, action: ActionChoice) => {
    setActionChoice(memberId, action);
    tutorialEvent({ type: 'actionChanged', memberId, action });
  };

  const handlePerformPlayerActions = () => {
    performPlayerActions();
    cancelSelection();
    tutorialEvent({ type: 'playerActionsPerformed' });
  };

  const handleDieSelect = (dieId: string) => {
    if (!game || !engine || game.phase !== 'player-assign') return;
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
    if (!selectedDie || !engine) return;
    const work = game?.player.works.find((candidate) => candidate.id === workId);
    if (!work) return;
    const legality = getDiePlacementLegality(engine, 'player', selectedDie, work, slotIndex);
    if (!legality.allowed) {
      cancelSelection();
      return;
    }
    const ok = placeDie(selectedDie.id, workId, slotIndex);
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
    const availability = getCardAvailability(engine, 'player', instance);
    if (!availability.allowed) {
      setMessage(availability.reason ?? '目前條件不允許使用這張牌。');
      return;
    }
    setCardInstance(instance);
    tutorialEvent({ type: 'cardDialogOpened', cardId: instance.cardId });
  };

  const handleCardConfirm = (target: SkillActivationTarget) => {
    if (!cardInstance) return;
    const cardId = cardInstance.cardId;
    const ok = playCard('player', cardInstance.instanceId, target);
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

  const resolveSkill = (memberId: string, skillId: string, target: SkillActivationTarget) => {
    const ok = activateSkill('player', memberId, skillId, target);
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
    finishPlayerAssignment();
    cancelSelection();
    tutorialEvent({ type: 'playerAssignmentFinished' });
  };

  if (appStage === 'start') {
    return (
      <>
        <StartScreen onStart={handleStart} onStartTutorial={handleStartTutorial} onOpenRoster={() => setRosterOpen(true)} />
        <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      </>
    );
  }

  if (appStage === 'draw' && draftRoster) {
    const drawnCharacters = draftRoster.player.flatMap((memberId) => {
      const character = gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    return (
      <>
        <DrawPhaseScreen
          characters={drawnCharacters}
          leaderStressBonus={gameDefinition.rules.leaderStressBonus}
          onReroll={handleReroll}
          onConfirm={handleConfirmRoster}
        />
        <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      </>
    );
  }

  if (!game || !engine) {
    return <StartScreen onStart={handleStart} onStartTutorial={handleStartTutorial} onOpenRoster={() => setRosterOpen(true)} />;
  }

  const pendingCard = cardInstance ? CARDS[cardInstance.cardId] : undefined;
  const pendingSkill = skillDialog ? SKILLS[skillDialog.skillId] : undefined;
  const useLegacyCardDialog = !!pendingCard && (
    mode === 'tutorial'
    || pendingCard.target.kind === 'voiceMode'
    || (pendingCard.target.kind === 'member' && !!pendingCard.target.skillPicker)
  );
  const useLegacySkillDialog = mode === 'tutorial';

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
      const ok = playCard('player', selectionMode.instance.instanceId, { memberId });
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
      const ok = playCard('player', selectionMode.instance.instanceId, { workId });
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
        onReset={handleRestart}
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

      <Container maxWidth={false} sx={{ py: 1.4, px: { xs: .8, md: 1.5 } }}>
        <ActionFeedback events={game.feedback} />
        {game.phase === 'finished' && (
          <Alert severity={game.winner === 'player' ? 'success' : game.winner === 'draw' ? 'info' : 'warning'} sx={{ mb: 1.2 }}>
            遊戲結束：{game.winner === 'player' ? '我方勝利' : game.winner === 'enemy' ? '對手勝利' : '平手'}。比分 {playerScore} : {enemyScore}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '300px minmax(0,1fr) 300px' }, gap: 1.25, alignItems: 'start' }}>
          <TeamColumn
            title="我方創作小隊"
            side="player"
            team={game.player}
            engine={engine}
            showActions={game.phase === 'player-plan'}
            actionChoices={actionChoices}
            onActionChange={handleActionChange}
            onActivateSkill={handleActivate}
            selection={memberCandidates ? { candidates: memberCandidates, onSelect: handleMemberSelection, onCancel: cancelSelection } : undefined}
          />

          <Stack spacing={1.05} sx={{ minWidth: 0 }}>
            <Paper sx={{ ...panelSx, py: .75, borderColor: '#ff9ab5', bgcolor: '#fff8fa' }}>
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
                {game.phase === 'player-plan' && (
                  <Button data-tutorial="perform-work" color="secondary" variant="contained" startIcon={<CasinoIcon />} onClick={handlePerformPlayerActions}>
                    進行創作
                  </Button>
                )}
                {game.phase === 'player-assign' && (
                  <Button data-tutorial="end-turn" color="warning" variant="contained" startIcon={<SkipNextIcon />} onClick={handleFinishPlayerAssignment}>
                    結束回合
                  </Button>
                )}
              </Stack>
            </Paper>

            <WorkBoard
              works={game.player.works}
              selectedDie={selectedDie}
              onSlotClick={game.phase === 'player-assign' ? handleSlotClick : undefined}
              workSelection={workCandidates ? { candidates: workCandidates, onSelect: handleWorkSelection, onCancel: cancelSelection } : undefined}
              slotSelection={selectionMode?.kind === 'die' && selectedDie ? {
                getLegality: (work, slotIndex) => getDiePlacementLegality(engine, 'player', selectedDie, work, slotIndex),
                onSelect: handleSlotClick,
                onCancel: cancelSelection,
              } : undefined}
            />

            <Paper sx={panelSx}>
              <Stack direction="row" alignItems="center" spacing={.7} sx={{ mb: .75 }}>
                <AutoAwesomeIcon sx={{ color: '#f4ba45', fontSize: 19 }} />
                <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>本回合骰子</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Dice</Typography>
              </Stack>
              <DiceTray
                dice={game.player.pendingDice}
                selectedDieId={selectedDieId}
                onSelect={handleDieSelect}
                selection={dieCandidates ? { candidates: dieCandidates, onSelect: handleSkillDieSelection, onCancel: cancelSelection } : undefined}
              />
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 238px' }, gap: 1.05 }}>
              <Paper sx={panelSx} data-feedback-anchor="hand:player">
                <Stack direction="row" spacing={.7} alignItems="center" sx={{ mb: .7 }}>
                  <HandshakeIcon sx={{ color: '#3bb8a5', fontSize: 19 }} />
                  <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>我的手牌</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Hand Cards · {game.player.hand.length}</Typography>
                </Stack>
                <CardHand
                  hand={game.player.hand}
                  onPlay={handleOpenCard}
                  getDisabledReason={mode === 'tutorial' ? undefined : (instance) => {
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

          <TeamColumn
            title="對手創作小隊"
            side="enemy"
            team={game.enemy}
            engine={engine}
            selection={memberCandidates ? { candidates: memberCandidates, onSelect: handleMemberSelection, onCancel: cancelSelection } : undefined}
          />
        </Box>
      </Container>

      <HandLimitDialog hand={game.player.hand} onDiscard={(instanceIds) => discardCards('player', instanceIds)} />

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
