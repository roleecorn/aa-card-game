import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { CHARACTERS, SKILLS } from '../content/catalog';
import { TUTORIAL_SKILL_TARGETS, type TutorialDieTarget } from '../tutorial/config';
import type { DieToken, GameState, SkillActivationTarget } from '../game/types';
import { useGameStore } from '../store/gameStore';

interface Props {
  open: boolean;
  memberId?: string;
  skillId?: string;
  game: GameState;
  onClose: () => void;
  onConfirm: (target: SkillActivationTarget) => void;
}

function fixedDieOption(dice: DieToken[], target?: TutorialDieTarget): DieToken[] {
  if (!target) return dice;
  const matches = dice.filter((die) => die.ownerId === target.ownerId && die.skill === target.skill);
  const fixed = matches[target.index ?? 0];
  return fixed ? [fixed] : [];
}

export function SkillActivationDialog({ open, memberId, skillId, game, onClose, onConfirm }: Props) {
  const mode = useGameStore((state) => state.mode);
  const skill = skillId ? SKILLS[skillId] : undefined;
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [sourceDieId, setSourceDieId] = useState('');
  const [targetDieId, setTargetDieId] = useState('');

  const tutorialTarget = mode !== 'tutorial'
    ? undefined
    : skillId === 'grimmBurningFrame'
      ? TUTORIAL_SKILL_TARGETS.grimmBurningFrame
      : skillId === 'mashiroSynthesis'
        ? TUTORIAL_SKILL_TARGETS.mashiroSynthesis
        : skillId === 'triangleRecovery'
          ? TUTORIAL_SKILL_TARGETS.triangleRecovery
          : undefined;

  useEffect(() => {
    setSelectedMemberId('');
    setSelectedWorkId('');
    setSourceDieId('');
    setTargetDieId('');
  }, [memberId, skillId]);

  const spec = skill?.activeTarget ?? { kind: 'none' as const };

  const memberOptions = useMemo(() => {
    if (!memberId) return [];
    let candidates;
    if (spec.kind === 'taggedMember') {
      candidates = [...game.player.members, ...game.enemy.members].filter((member) => {
        if (spec.excludeSelf && member.defId === memberId) return false;
        return CHARACTERS[member.defId]?.tags?.includes(spec.tag) ?? false;
      });
    } else if (spec.kind === 'member') {
      if (spec.relation === 'enemy') candidates = game.enemy.members;
      else if (spec.relation === 'otherAlly') candidates = game.player.members.filter((member) => member.defId !== memberId);
      else candidates = game.player.members;
    } else {
      return [];
    }
    if (skillId === 'triangleRecovery' && mode === 'tutorial') {
      return candidates.filter((member) => member.defId === TUTORIAL_SKILL_TARGETS.triangleRecovery.memberId);
    }
    return candidates;
  }, [game, memberId, mode, skillId, spec]);

  const workOptions = useMemo(() => {
    if (!memberId || spec.kind !== 'work') return [];
    if (spec.relation === 'enemy') return game.enemy.works;
    if (spec.relation === 'owner') return game.player.works.filter((work) => work.ownerId === memberId);
    return game.player.works;
  }, [game, memberId, spec]);

  const sourceDice = useMemo(() => {
    const candidates = game.player.pendingDice.filter((die) => memberId && die.ownerId !== memberId);
    if (mode === 'tutorial' && skillId === 'mashiroSynthesis') {
      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.mashiroSynthesis.sourceDie);
    }
    return candidates;
  }, [game, memberId, mode, skillId]);

  const copyTargetDice = useMemo(() => {
    const candidates = game.player.pendingDice.filter((die) => die.ownerId === memberId);
    if (mode === 'tutorial' && skillId === 'mashiroSynthesis') {
      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.mashiroSynthesis.targetDie);
    }
    return candidates;
  }, [game, memberId, mode, skillId]);

  const pendingDieOptions = useMemo(() => {
    if (!memberId || spec.kind !== 'pendingDie') return [];
    let candidates;
    if (spec.relation === 'enemy') candidates = game.enemy.pendingDice;
    else if (spec.relation === 'self') candidates = game.player.pendingDice.filter((die) => die.ownerId === memberId);
    else if (spec.relation === 'otherAlly') candidates = game.player.pendingDice.filter((die) => die.ownerId !== memberId);
    else candidates = game.player.pendingDice;
    if (mode === 'tutorial' && skillId === 'grimmBurningFrame') {
      return fixedDieOption(candidates, TUTORIAL_SKILL_TARGETS.grimmBurningFrame.targetDie);
    }
    return candidates;
  }, [game, memberId, mode, skillId, spec]);

  if (!skill || !memberId) return null;

  const target: SkillActivationTarget = {
    memberId: selectedMemberId || undefined,
    workId: selectedWorkId || undefined,
    sourceDieId: sourceDieId || undefined,
    targetDieId: targetDieId || undefined,
  };

  const valid = spec.kind === 'none'
    || ((spec.kind === 'member' || spec.kind === 'taggedMember') && !!selectedMemberId)
    || (spec.kind === 'work' && !!selectedWorkId)
    || (spec.kind === 'copyPendingDie' && !!sourceDieId && !!targetDieId)
    || (spec.kind === 'pendingDie' && !!targetDieId);

  const tutorialTargetLabel = mode === 'tutorial'
    ? skillId === 'grimmBurningFrame'
      ? '格林的第一顆 AA 骰'
      : skillId === 'mashiroSynthesis'
        ? '來源：格林的第一顆 Text 骰／目標：真白的第一顆 AA 骰'
        : skillId === 'triangleRecovery'
          ? '八代'
          : undefined
    : undefined;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{CHARACTERS[memberId]?.name ?? memberId}｜{skill.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{skill.description}</Typography>
          {skill.activeHint && <Typography variant="body2">{skill.activeHint}</Typography>}
          {tutorialTarget && tutorialTargetLabel && (
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
              教學指定目標：{tutorialTargetLabel}。此步驟只能選擇教學指定對象。
            </Typography>
          )}

          {(spec.kind === 'member' || spec.kind === 'taggedMember') && (
            <FormControl fullWidth>
              <InputLabel>目標角色</InputLabel>
              <Select value={selectedMemberId} label="目標角色" onChange={(event) => setSelectedMemberId(event.target.value)}>
                {memberOptions.map((member) => (
                  <MenuItem key={member.defId} value={member.defId}>{CHARACTERS[member.defId]?.name ?? member.defId}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {spec.kind === 'work' && (
            <FormControl fullWidth>
              <InputLabel>目標作品</InputLabel>
              <Select value={selectedWorkId} label="目標作品" onChange={(event) => setSelectedWorkId(event.target.value)}>
                {workOptions.map((work) => <MenuItem key={work.id} value={work.id}>{work.title} · {work.type}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {spec.kind === 'copyPendingDie' && (
            <>
              <FormControl fullWidth>
                <InputLabel>來源骰</InputLabel>
                <Select value={sourceDieId} label="來源骰" onChange={(event) => setSourceDieId(event.target.value)}>
                  {sourceDice.map((die) => (
                    <MenuItem key={die.id} value={die.id}>
                      {CHARACTERS[die.ownerId]?.name ?? die.ownerId} · {die.skill.toUpperCase()} {die.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>要修改的骰</InputLabel>
                <Select value={targetDieId} label="要修改的骰" onChange={(event) => setTargetDieId(event.target.value)}>
                  {copyTargetDice.map((die) => (
                    <MenuItem key={die.id} value={die.id}>
                      {CHARACTERS[die.ownerId]?.name ?? die.ownerId} · {die.skill.toUpperCase()} {die.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {spec.kind === 'pendingDie' && (
            <FormControl fullWidth>
              <InputLabel>目標骰</InputLabel>
              <Select value={targetDieId} label="目標骰" onChange={(event) => setTargetDieId(event.target.value)}>
                {pendingDieOptions.map((die) => (
                  <MenuItem key={die.id} value={die.id}>
                    {CHARACTERS[die.ownerId]?.name ?? die.ownerId} · {die.skill.toUpperCase()} {die.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onConfirm(target)}>發動</Button>
      </DialogActions>
    </Dialog>
  );
}
