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
import type { GameState, SkillActivationTarget } from '../game/types';

interface Props {
  open: boolean;
  memberId?: string;
  skillId?: string;
  game: GameState;
  onClose: () => void;
  onConfirm: (target: SkillActivationTarget) => void;
}

export function SkillActivationDialog({ open, memberId, skillId, game, onClose, onConfirm }: Props) {
  const skill = skillId ? SKILLS[skillId] : undefined;
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [sourceDieId, setSourceDieId] = useState('');
  const [targetDieId, setTargetDieId] = useState('');

  useEffect(() => {
    setSelectedMemberId('');
    setSelectedWorkId('');
    setSourceDieId('');
    setTargetDieId('');
  }, [memberId, skillId]);

  const spec = skill?.activeTarget ?? { kind: 'none' as const };

  const memberOptions = useMemo(() => {
    if (!memberId) return [];
    if (spec.kind === 'taggedMember') {
      return [...game.player.members, ...game.enemy.members].filter((member) => {
        if (spec.excludeSelf && member.defId === memberId) return false;
        return CHARACTERS[member.defId]?.tags?.includes(spec.tag) ?? false;
      });
    }
    if (spec.kind !== 'member') return [];
    if (spec.relation === 'enemy') return game.enemy.members;
    if (spec.relation === 'otherAlly') return game.player.members.filter((member) => member.defId !== memberId);
    return game.player.members;
  }, [game, memberId, spec]);

  const workOptions = useMemo(() => {
    if (!memberId || spec.kind !== 'work') return [];
    if (spec.relation === 'enemy') return game.enemy.works;
    if (spec.relation === 'owner') return game.player.works.filter((work) => work.ownerId === memberId);
    return game.player.works;
  }, [game, memberId, spec]);

  const sourceDice = useMemo(
    () => game.player.pendingDice.filter((die) => memberId && die.ownerId !== memberId),
    [game, memberId],
  );

  const copyTargetDice = useMemo(
    () => game.player.pendingDice.filter((die) => die.ownerId === memberId),
    [game, memberId],
  );

  const pendingDieOptions = useMemo(() => {
    if (!memberId || spec.kind !== 'pendingDie') return [];
    if (spec.relation === 'enemy') return game.enemy.pendingDice;
    if (spec.relation === 'self') return game.player.pendingDice.filter((die) => die.ownerId === memberId);
    if (spec.relation === 'otherAlly') return game.player.pendingDice.filter((die) => die.ownerId !== memberId);
    return game.player.pendingDice;
  }, [game, memberId, spec]);

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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{CHARACTERS[memberId]?.name ?? memberId}｜{skill.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{skill.description}</Typography>
          {skill.activeHint && <Typography variant="body2">{skill.activeHint}</Typography>}

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
