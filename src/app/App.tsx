import { useCallback, useMemo, useState } from 'react';
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
import { CARDS, SKILLS } from '../content/catalog';
import { characterList } from '../content/characters';
import { EngineSession } from '../game/engine';
import type { CardInstance, SkillActivationTarget } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { GameHeader } from '../components/GameHeader';
import { TeamColumn } from '../components/TeamColumn';
import { WorkBoard } from '../components/WorkBoard';
import { DiceTray } from '../components/DiceTray';
import { CardHand } from '../components/CardHand';
import { CardPlayDialog } from '../components/CardPlayDialog';
import { SkillActivationDialog } from '../components/SkillActivationDialog';
import { LogPanel } from '../components/LogPanel';
import { CharacterRosterDialog } from '../components/CharacterRosterDialog';
import { StartScreen } from '../components/StartScreen';
import { DrawPhaseScreen } from '../components/DrawPhaseScreen';

type AppStage = 'start' | 'draw' | 'battle';

const panelSx = {
  p: 1.15,
  border: '1.5px solid #dfe8f4',
  boxShadow: '0 3px 12px rgba(49,74,112,.05)',
  bgcolor: 'rgba(255,255,255,.94)',
};

export default function App() {
  const game = useGameStore((state) => state.game);
  const actionChoices = useGameStore((state) => state.actionChoices);
  const reset = useGameStore((state) => state.reset);
  const startGame = useGameStore((state) => state.startGame);
  const setActionChoice = useGameStore((state) => state.setActionChoice);
  const performPlayerActions = useGameStore((state) => state.performPlayerActions);
  const placeDie = useGameStore((state) => state.placeDie);
  const finishPlayerAssignment = useGameStore((state) => state.finishPlayerAssignment);
  const playCard = useGameStore((state) => state.playCard);
  const activateSkill = useGameStore((state) => state.activateSkill);

  const engine = useMemo(() => game ? new EngineSession(game) : undefined, [game]);
  const [selectedDieId, setSelectedDieId] = useState<string>();
  const [cardInstance, setCardInstance] = useState<CardInstance>();
  const [skillDialog, setSkillDialog] = useState<{ memberId: string; skillId: string }>();
  const [message, setMessage] = useState<string>();
  const [rosterOpen, setRosterOpen] = useState(false);
  const [appStage, setAppStage] = useState<AppStage>('start');
  const [draftRoster, setDraftRoster] = useState<{ player: string[]; enemy: string[] }>();

  const selectedDie = game?.player.pendingDice.find((die) => die.id === selectedDieId);
  const playerScore = engine?.scoreTeam('player') ?? 0;
  const enemyScore = engine?.scoreTeam('enemy') ?? 0;

  const playableIds = useMemo(
    () => characterList.filter((character) => !character.tags?.includes('not-standard-playable')).map((character) => character.id),
    [],
  );

  const shuffledPlayableIds = useCallback(() => {
    const ids = [...playableIds];
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    return ids;
  }, [playableIds]);

  const handleStart = () => {
    reset();
    const six = shuffledPlayableIds().slice(0, 6);
    setDraftRoster({ player: six.slice(0, 3), enemy: six.slice(3, 6) });
    setSelectedDieId(undefined);
    setCardInstance(undefined);
    setSkillDialog(undefined);
    setMessage(undefined);
    setAppStage('draw');
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

  const handleConfirmRoster = () => {
    if (!draftRoster) return;
    startGame(draftRoster.player, draftRoster.enemy);
    setAppStage('battle');
  };

  const handleRestart = () => {
    reset();
    setDraftRoster(undefined);
    setSelectedDieId(undefined);
    setCardInstance(undefined);
    setSkillDialog(undefined);
    setMessage(undefined);
    setAppStage('start');
  };

  const handleSlotClick = (workId: string, slotIndex: number) => {
    if (!selectedDie) return;
    const ok = placeDie(selectedDie.id, workId, slotIndex);
    if (ok) setSelectedDieId(undefined);
    else setMessage('這顆骰不能放在該位置：請檢查 Design → Text → AA 順序、作品適性與既有骰值。');
  };

  const handleCardConfirm = (target: SkillActivationTarget) => {
    if (!cardInstance) return;
    const card = CARDS[cardInstance.cardId];
    const ok = playCard('player', cardInstance.instanceId, target);
    setCardInstance(undefined);
    setMessage(ok ? `已使用「${card?.name ?? cardInstance.cardId}」。` : '目前條件不允許使用這張牌。');
  };

  const handleActivate = (memberId: string, skillId: string) => {
    const skill = SKILLS[skillId];
    if (!skill) return;
    if (skill.activeTarget?.kind && skill.activeTarget.kind !== 'none') {
      setSkillDialog({ memberId, skillId });
      return;
    }
    const ok = activateSkill('player', memberId, skillId, {});
    setMessage(ok ? `已發動「${skill.name}」。` : '技能目前不能發動。');
  };

  const handleSkillConfirm = (target: SkillActivationTarget) => {
    if (!skillDialog) return;
    const skill = SKILLS[skillDialog.skillId];
    const ok = activateSkill('player', skillDialog.memberId, skillDialog.skillId, target);
    setSkillDialog(undefined);
    setMessage(ok ? `已發動「${skill?.name ?? skillDialog.skillId}」。` : '技能目前不能發動，請檢查目標與使用次數。');
  };

  if (appStage === 'start') {
    return (
      <>
        <StartScreen onStart={handleStart} onOpenRoster={() => setRosterOpen(true)} />
        <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      </>
    );
  }

  if (appStage === 'draw' && draftRoster) {
    const drawnCharacters = draftRoster.player
      .map((memberId) => characterList.find((character) => character.id === memberId))
      .filter((character): character is (typeof characterList)[number] => !!character);
    return (
      <>
        <DrawPhaseScreen
          characters={drawnCharacters}
          onReroll={handleReroll}
          onConfirm={handleConfirmRoster}
        />
        <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
      </>
    );
  }

  if (!game || !engine) {
    return <StartScreen onStart={handleStart} onOpenRoster={() => setRosterOpen(true)} />;
  }

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
      <Container maxWidth={false} sx={{ py: 1.4, px: { xs: .8, md: 1.5 } }}>
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
            onActionChange={setActionChoice}
            onActivateSkill={handleActivate}
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
                  <Button color="secondary" variant="contained" startIcon={<CasinoIcon />} onClick={() => { performPlayerActions(); setSelectedDieId(undefined); }}>
                    進行創作
                  </Button>
                )}
                {game.phase === 'player-assign' && (
                  <Button color="warning" variant="contained" startIcon={<SkipNextIcon />} onClick={() => { finishPlayerAssignment(); setSelectedDieId(undefined); }}>
                    結束回合
                  </Button>
                )}
              </Stack>
            </Paper>

            <WorkBoard works={game.player.works} selectedDie={selectedDie} onSlotClick={game.phase === 'player-assign' ? handleSlotClick : undefined} />

            <Paper sx={panelSx}>
              <Stack direction="row" alignItems="center" spacing={.7} sx={{ mb: .75 }}>
                <AutoAwesomeIcon sx={{ color: '#f4ba45', fontSize: 19 }} />
                <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>本回合骰子</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Dice</Typography>
              </Stack>
              <DiceTray dice={game.player.pendingDice} selectedDieId={selectedDieId} onSelect={(id) => setSelectedDieId((current) => current === id ? undefined : id)} />
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 238px' }, gap: 1.05 }}>
              <Paper sx={panelSx}>
                <Stack direction="row" spacing={.7} alignItems="center" sx={{ mb: .7 }}>
                  <HandshakeIcon sx={{ color: '#3bb8a5', fontSize: 19 }} />
                  <Typography sx={{ fontSize: 15.5, fontWeight: 950 }}>我的手牌</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic' }}>Hand Cards · {game.player.hand.length}</Typography>
                </Stack>
                <CardHand hand={game.player.hand} onPlay={(instance) => game.phase !== 'finished' && setCardInstance(instance)} />
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

          <TeamColumn title="對手創作小隊" side="enemy" team={game.enemy} engine={engine} />
        </Box>
      </Container>

      <CardPlayDialog open={!!cardInstance} cardInstance={cardInstance} game={game} onClose={() => setCardInstance(undefined)} onConfirm={handleCardConfirm} />
      <SkillActivationDialog open={!!skillDialog} memberId={skillDialog?.memberId} skillId={skillDialog?.skillId} game={game} onClose={() => setSkillDialog(undefined)} onConfirm={handleSkillConfirm} />
      <CharacterRosterDialog open={rosterOpen} onClose={() => setRosterOpen(false)} />
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
