import {
  Box,
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
import { CARDS, CHARACTERS, SKILLS } from '../content/catalog';
import { TUTORIAL_CARD_TARGETS } from '../content/tutorial';
import type { CardInstance, CharacterState, GameState, SkillActivationTarget } from '../game/types';
import type { SkillStat } from '../game/schema';
import { useGameStore } from '../store/gameStore';

interface Props {
  open: boolean;
  cardInstance?: CardInstance;
  game: GameState;
  onClose: () => void;
  onConfirm: (target: SkillActivationTarget) => void;
}

const SKILL_STATS: SkillStat[] = ['design', 'text', 'aa'];

function effectiveStat(member: CharacterState, stat: SkillStat): number {
  return Math.max(
    0,
    member.permanentStats[stat]
      + member.timedStatModifiers
        .filter((modifier) => modifier.skill === stat)
        .reduce((sum, modifier) => sum + modifier.amount, 0),
  );
}

function guideEligibleStats(member?: CharacterState): SkillStat[] {
  if (!member) return [];
  return SKILL_STATS.filter((stat) => effectiveStat(member, stat) <= 1);
}

function hasExternalEffectImmunity(memberId: string): boolean {
  const definition = CHARACTERS[memberId];
  if (!definition) return false;
  return definition.skillIds.some((skillId) => SKILLS[skillId]?.tags?.includes('external-effect-immune'));
}

export function CardPlayDialog({ open, cardInstance, game, onClose, onConfirm }: Props) {
  const mode = useGameStore((state) => state.mode);
  const card = cardInstance ? CARDS[cardInstance.cardId] : undefined;
  const [memberId, setMemberId] = useState('');
  const [workId, setWorkId] = useState('');
  const [skill, setSkill] = useState<SkillStat>('design');
  const [voiceMode, setVoiceMode] = useState<'relief' | 'design' | 'text'>('relief');

  const tutorialTarget = mode === 'tutorial' && cardInstance?.cardId === 'guide'
    ? TUTORIAL_CARD_TARGETS.guide
    : undefined;

  useEffect(() => {
    setMemberId('');
    setWorkId('');
    setSkill(tutorialTarget?.skill ?? 'design');
    setVoiceMode('relief');
  }, [cardInstance?.instanceId, tutorialTarget?.skill]);

  const members = useMemo(() => {
    if (!card || card.target.kind !== 'member') return [];
    let candidates = card.target.relation === 'ally' ? game.player.members : game.enemy.members;
    candidates = candidates.filter((member) => !hasExternalEffectImmunity(member.defId));
    if (card.kind === 'coordination') {
      candidates = candidates.filter((member) => !CHARACTERS[member.defId]?.tags?.includes('coordination-untargetable'));
    }
    if (card.id === 'guide') {
      candidates = candidates.filter((member) => guideEligibleStats(member).length > 0);
    }
    if (!tutorialTarget) return candidates;
    return candidates.filter((member) => member.defId === tutorialTarget.memberId);
  }, [card, game, tutorialTarget]);

  const selectedMember = useMemo(
    () => [...game.player.members, ...game.enemy.members].find((member) => member.defId === memberId),
    [game, memberId],
  );

  const skillOptions = useMemo(() => {
    if (!card || card.target.kind !== 'member' || !card.target.skillPicker) return SKILL_STATS;
    if (tutorialTarget) return [tutorialTarget.skill];
    if (card.id === 'guide') return guideEligibleStats(selectedMember);
    return SKILL_STATS;
  }, [card, selectedMember, tutorialTarget]);

  const works = useMemo(() => {
    if (!card || card.target.kind !== 'work') return [];
    return card.target.relation === 'ally' ? game.player.works : game.enemy.works;
  }, [card, game]);

  if (!card) return null;

  const targetReady = card.target.kind === 'none'
    || card.target.kind === 'voiceMode'
    || (card.target.kind === 'member' && !!memberId && (!card.target.skillPicker || skillOptions.includes(skill)))
    || (card.target.kind === 'work' && !!workId);

  const confirm = () => {
    const target: SkillActivationTarget = {};
    if (card.target.kind === 'member') {
      target.memberId = memberId;
      if (card.target.skillPicker) target.skill = skill;
    }
    if (card.target.kind === 'work') target.workId = workId;
    if (card.target.kind === 'voiceMode') target.voiceMode = voiceMode;
    onConfirm(target);
  };

  const handleMemberChange = (nextMemberId: string) => {
    setMemberId(nextMemberId);
    if (card.target.kind !== 'member' || !card.target.skillPicker || tutorialTarget) return;
    const nextMember = [...game.player.members, ...game.enemy.members].find((member) => member.defId === nextMemberId);
    const nextOptions = card.id === 'guide' ? guideEligibleStats(nextMember) : SKILL_STATS;
    setSkill(nextOptions[0] ?? 'design');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{card.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {card.art && (
            <Box
              component="img"
              src={card.art}
              alt={card.name}
              sx={{
                width: '100%',
                aspectRatio: '8 / 5',
                objectFit: 'cover',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          )}
          <Typography color="text.secondary">{card.description}</Typography>
          {tutorialTarget && (
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
              教學指定目標：真白／Text。此步驟只能選擇教學指定對象。
            </Typography>
          )}
          {card.target.kind === 'member' && (
            <FormControl fullWidth>
              <InputLabel>目標角色</InputLabel>
              <Select value={memberId} label="目標角色" onChange={(event) => handleMemberChange(event.target.value)}>
                {members.map((member) => <MenuItem key={member.defId} value={member.defId}>{CHARACTERS[member.defId]?.name ?? member.defId}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {card.target.kind === 'member' && card.target.skillPicker && (
            <FormControl fullWidth disabled={!memberId}>
              <InputLabel>能力</InputLabel>
              <Select value={skillOptions.includes(skill) ? skill : ''} label="能力" onChange={(event) => setSkill(event.target.value as SkillStat)}>
                {skillOptions.map((stat) => (
                  <MenuItem key={stat} value={stat}>{stat === 'design' ? 'Design' : stat === 'text' ? 'Text' : 'AA'}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {card.target.kind === 'work' && (
            <FormControl fullWidth>
              <InputLabel>目標作品</InputLabel>
              <Select value={workId} label="目標作品" onChange={(event) => setWorkId(event.target.value)}>
                {works.map((work) => <MenuItem key={work.id} value={work.id}>{work.title}（{work.type}）</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {card.target.kind === 'voiceMode' && (
            <FormControl fullWidth>
              <InputLabel>語音會議模式</InputLabel>
              <Select value={voiceMode} label="語音會議模式" onChange={(event) => setVoiceMode(event.target.value as typeof voiceMode)}>
                <MenuItem value="relief">全隊壓力 -1</MenuItem>
                <MenuItem value="design">全隊額外 Design 骰 +1</MenuItem>
                <MenuItem value="text">全隊額外 Text 骰 +1</MenuItem>
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={!targetReady} onClick={confirm}>使用</Button>
      </DialogActions>
    </Dialog>
  );
}
