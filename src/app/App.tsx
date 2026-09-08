import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { CARDS, SKILLS } from '../content/catalog';
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

export default function App() {
  const game = useGameStore((state) => state.game);
  const actionChoices = useGameStore((state) => state.actionChoices);
  const reset = useGameStore((state) => state.reset);
  const setActionChoice = useGameStore((state) => state.setActionChoice);
  const performPlayerActions = useGameStore((state) => state.performPlayerActions);
  const placeDie = useGameStore((state) => state.placeDie);
  const finishPlayerAssignment = useGameStore((state) => state.finishPlayerAssignment);
  const playCard = useGameStore((state) => state.playCard);
  const activateSkill = useGameStore((state) => state.activateSkill);

  const engine = useMemo(() => new EngineSession(game), [game]);
  const [selectedDieId, setSelectedDieId] = useState<string>();
  const [cardInstance, setCardInstance] = useState<CardInstance>();
  const [skillDialog, setSkillDialog] = useState<{ memberId: string; skillId: string }>();
  const [message, setMessage] = useState<string>();

  const selectedDie = game.player.pendingDice.find((die) => die.id === selectedDieId);
  const playerScore = engine.scoreTeam('player');
  const enemyScore = engine.scoreTeam('enemy');

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <GameHeader game={game} playerScore={playerScore} enemyScore={enemyScore} onReset={() => { reset(); setSelectedDieId(undefined); }} />
      <Container maxWidth={false} sx={{ py: 2, px: { xs: 1, md: 2 } }}>
        {game.phase === 'finished' && (
          <Alert severity={game.winner === 'player' ? 'success' : game.winner === 'draw' ? 'info' : 'warning'} sx={{ mb: 2 }}>
            遊戲結束：{game.winner === 'player' ? '我方勝利' : game.winner === 'enemy' ? '對手勝利' : '平手'}。比分 {playerScore} : {enemyScore}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '340px minmax(0, 1fr) 340px' }, gap: 2, alignItems: 'start' }}>
          <TeamColumn
            title="我方創作小隊"
            team={game.player}
            engine={engine}
            showActions={game.phase === 'player-plan'}
            actionChoices={actionChoices}
            onActionChange={setActionChoice}
            onActivateSkill={handleActivate}
          />

          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Paper sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1}>
                <Box>
                  <Typography variant="h6">進行中的作品</Typography>
                  <Typography variant="body2" color="text.secondary">Design → Text → AA。高骰可以覆蓋同類型的低骰。</Typography>
                </Box>
                {game.phase === 'player-plan' && (
                  <Button variant="contained" startIcon={<CasinoIcon />} onClick={() => { performPlayerActions(); setSelectedDieId(undefined); }}>
                    進行創作
                  </Button>
                )}
                {game.phase === 'player-assign' && (
                  <Button variant="contained" color="warning" startIcon={<SkipNextIcon />} onClick={() => { finishPlayerAssignment(); setSelectedDieId(undefined); }}>
                    結束回合
                  </Button>
                )}
              </Stack>
            </Paper>

            <WorkBoard works={game.player.works} selectedDie={selectedDie} onSlotClick={game.phase === 'player-assign' ? handleSlotClick : undefined} />

            <Paper sx={{ p: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AutoAwesomeIcon color="primary" />
                <Typography variant="h6">本回合骰子</Typography>
              </Stack>
              <DiceTray dice={game.player.pendingDice} selectedDieId={selectedDieId} onSelect={(id) => setSelectedDieId((current) => current === id ? undefined : id)} />
            </Paper>

            <Paper sx={{ p: 1.5 }}>
              <Typography variant="h6">我的手牌 · {game.player.hand.length}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>卡牌框與插圖已改用本次 Prototype 美術資源；卡牌效果走與角色技能共用的 effect pipeline。</Typography>
              <CardHand hand={game.player.hand} onPlay={(instance) => game.phase !== 'finished' && setCardInstance(instance)} />
            </Paper>

            <LogPanel logs={game.logs} />
          </Stack>

          <Stack spacing={2}>
            <TeamColumn title="對手創作小隊" team={game.enemy} engine={engine} />
            <Paper sx={{ p: 1.5 }}>
              <Typography variant="subtitle1">技能系統狀態</Typography>
              <Typography variant="body2" color="text.secondary">
                綠色「已實裝」會真正進入 GameEngine；灰色「規劃中」只保留規則草案，不會觸發。
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                新技能通常只需新增 declarative definition。只有全新 mechanic 才需在 EffectRegistry 註冊新的 handler。
              </Typography>
            </Paper>
          </Stack>
        </Box>
      </Container>

      <CardPlayDialog
        open={!!cardInstance}
        cardInstance={cardInstance}
        game={game}
        onClose={() => setCardInstance(undefined)}
        onConfirm={handleCardConfirm}
      />
      <SkillActivationDialog
        open={!!skillDialog}
        memberId={skillDialog?.memberId}
        skillId={skillDialog?.skillId}
        game={game}
        onClose={() => setSkillDialog(undefined)}
        onConfirm={handleSkillConfirm}
      />
      <Snackbar open={!!message} autoHideDuration={3500} onClose={() => setMessage(undefined)}>
        <Alert severity="info" onClose={() => setMessage(undefined)}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
