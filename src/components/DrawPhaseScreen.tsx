import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import type { CharacterDefinition } from '../game/schema';
import { SKILLS } from '../content/catalog';
import { getCharacterTagName } from '../content/characterTags';

export type DrawPhase =
  | 'intro'
  | 'dealing'
  | 'revealing'
  | 'selection'
  | 'rerolling'
  | 'leader-selection'
  | 'confirmed';

interface Props {
  characters: CharacterDefinition[];
  leaderStressBonus: number;
  onReroll: (index: number) => void;
  onConfirm: (leaderId: string) => void;
}

export function DrawPhaseScreen({ characters, leaderStressBonus, onReroll, onConfirm }: Props) {
  const [phase, setPhase] = useState<DrawPhase>('intro');
  const [revealCount, setRevealCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [rerollUsed, setRerollUsed] = useState(false);
  const [rerollIndex, setRerollIndex] = useState<number>();

  useEffect(() => {
    if (phase === 'intro') {
      const timer = window.setTimeout(() => setPhase('dealing'), 520);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'dealing') {
      const timer = window.setTimeout(() => {
        if (!characters.length) {
          setPhase('selection');
          return;
        }
        setRevealCount(1);
        setPhase('revealing');
      }, 720);
      return () => window.clearTimeout(timer);
    }
    if (phase !== 'revealing') return;

    if (revealCount < characters.length) {
      const timer = window.setTimeout(
        () => setRevealCount((current) => Math.min(characters.length, current + 1)),
        420,
      );
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setPhase('selection'), 520);
    return () => window.clearTimeout(timer);
  }, [characters.length, phase, revealCount]);

  useEffect(() => {
    if (phase !== 'rerolling' || rerollIndex === undefined) return;
    const timer = window.setTimeout(() => {
      onReroll(rerollIndex);
      setSelectedIndex(undefined);
      setRerollIndex(undefined);
      setPhase('selection');
    }, 950);
    return () => window.clearTimeout(timer);
  }, [onReroll, phase, rerollIndex]);

  const title = phase === 'intro'
    ? '正在決定你的隊伍'
    : phase === 'dealing'
    ? `抽出 ${characters.length} 名創作夥伴`
    : phase === 'rerolling'
    ? '重新抽取中…'
    : phase === 'leader-selection'
    ? '選擇組長'
    : phase === 'confirmed'
    ? '隊伍確認'
    : '你的初始隊伍';

  const handleReroll = () => {
    if (selectedIndex === undefined || rerollUsed || phase !== 'selection') return;
    setRerollUsed(true);
    setRerollIndex(selectedIndex);
    setPhase('rerolling');
  };

  const handleConfirmTeam = () => {
    if (phase !== 'selection') return;
    setSelectedIndex(undefined);
    setPhase('leader-selection');
  };

  const handleConfirmLeader = () => {
    if (phase !== 'leader-selection' || selectedIndex === undefined) return;
    const leader = characters[selectedIndex];
    if (!leader) return;
    setPhase('confirmed');
    onConfirm(leader.id);
  };

  const skipReveal = () => {
    setRevealCount(characters.length);
    setPhase('selection');
  };

  const desktopColumns = `repeat(${Math.min(Math.max(characters.length, 1), 4)}, minmax(0,1fr))`;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 1.2, md: 3 },
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
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 700 }}>
            {phase === 'selection'
              ? (rerollUsed ? '已使用本局重抽。可直接確認隊伍，或先查看角色技能。' : '點擊角色卡可指定本局唯一一次重抽；確認隊伍後再選擇組長。')
              : phase === 'leader-selection'
              ? `點擊一名隊員擔任組長；組長本局壓力上限 +${leaderStressBonus}。`
              : phase === 'confirmed'
              ? '準備進入創作對局'
              : '角色卡將依序揭曉'}
          </Typography>
        </Stack>

        <Box sx={{ width: 'min(1280px, 100%)', display: 'grid', gridTemplateColumns: { xs: '1fr', md: desktopColumns }, gap: { xs: 1.4, md: 2.2 } }}>
          {characters.map((character, index) => {
            const isRerolling = phase === 'rerolling' && rerollIndex === index;
            const fullyRevealed = phase === 'selection' || phase === 'leader-selection' || phase === 'confirmed' || phase === 'rerolling';
            const revealed = fullyRevealed || index < revealCount;
            const selected = selectedIndex === index;
            const interactive = phase === 'selection' || phase === 'leader-selection';
            return (
              <DrawCard
                key={character.id}
                character={character}
                index={index}
                revealed={revealed && !isRerolling}
                selected={selected}
                selectedLabel={phase === 'leader-selection' ? '組長' : '已選取'}
                interactive={interactive}
                isRerolling={isRerolling}
                onClick={() => interactive && setSelectedIndex((current) => current === index ? undefined : index)}
              />
            );
          })}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {!['selection', 'rerolling', 'leader-selection', 'confirmed'].includes(phase) && (
            <Button
              variant="text"
              onClick={skipReveal}
              sx={{ minWidth: 140, fontWeight: 850 }}
            >
              跳過抽卡動畫
            </Button>
          )}
          {phase === 'selection' && (
            <>
              <Button
                variant="outlined"
                startIcon={<ReplayRoundedIcon />}
                disabled={rerollUsed || selectedIndex === undefined}
                onClick={handleReroll}
                sx={{ minWidth: 170, fontWeight: 900 }}
              >
                {rerollUsed ? '已重抽' : '重新抽取'}
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleRoundedIcon />}
                onClick={handleConfirmTeam}
                sx={{ minWidth: 170, fontWeight: 950 }}
              >
                確認隊伍
              </Button>
            </>
          )}
          {phase === 'leader-selection' && (
            <Button
              variant="contained"
              startIcon={<CheckCircleRoundedIcon />}
              disabled={selectedIndex === undefined}
              onClick={handleConfirmLeader}
              sx={{ minWidth: 190, fontWeight: 950 }}
            >
              確認組長並開始
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function DrawCard({
  character,
  index,
  revealed,
  selected,
  selectedLabel,
  interactive,
  isRerolling,
  onClick,
}: {
  character: CharacterDefinition;
  index: number;
  revealed: boolean;
  selected: boolean;
  selectedLabel: string;
  interactive: boolean;
  isRerolling: boolean;
  onClick: () => void;
}) {
  const skills = useMemo(
    () => character.skillIds.map((skillId) => SKILLS[skillId]).filter((skill): skill is NonNullable<typeof skill> => !!skill),
    [character.skillIds],
  );

  return (
    <Box
      onClick={onClick}
      sx={{
        perspective: '1200px',
        cursor: interactive ? 'pointer' : 'default',
        minHeight: { xs: 540, md: 590 },
        animation: isRerolling ? 'rerollCard .95s ease-in-out both' : `dealCard .55s cubic-bezier(.2,.8,.2,1) ${index * 90}ms both`,
        '@keyframes dealCard': {
          from: { opacity: 0, transform: 'translateY(48px) scale(.9) rotate(2deg)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1) rotate(0)' },
        },
        '@keyframes rerollCard': {
          '0%': { opacity: 1, transform: 'translateY(0) rotate(0)' },
          '35%': { opacity: 0, transform: 'translateY(-52px) rotate(-5deg) scale(.9)' },
          '60%': { opacity: 0, transform: 'translateY(34px) rotate(4deg) scale(.9)' },
          '100%': { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 'inherit',
          transformStyle: 'preserve-3d',
          transition: 'transform 560ms cubic-bezier(.2,.75,.25,1)',
          transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <Paper
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            border: '2px solid #ccd8e8',
            bgcolor: '#2c3d5f',
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,.08) 25%, transparent 25% 50%, rgba(255,255,255,.08) 50% 75%, transparent 75%)',
            backgroundSize: '34px 34px',
            boxShadow: '0 16px 34px rgba(39,57,89,.16)',
          }}
        >
          <Box sx={{ width: 92, height: 126, border: '2px solid rgba(255,255,255,.72)', borderRadius: 3, display: 'grid', placeItems: 'center', transform: 'rotate(-5deg)' }}>
            <AutoAwesomeRoundedIcon sx={{ color: '#fff', fontSize: 42 }} />
          </Box>
        </Paper>

        <Paper
          sx={{
            position: 'absolute',
            inset: 0,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            border: selected ? '3px solid #ff7098' : '2px solid #d5dfec',
            boxShadow: selected ? '0 0 0 5px rgba(255,112,152,.13), 0 18px 42px rgba(42,63,99,.17)' : '0 18px 42px rgba(42,63,99,.13)',
            transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
            bgcolor: '#fff',
          }}
        >
          <Box sx={{ position: 'relative', height: { xs: 245, md: 265 }, overflow: 'hidden', bgcolor: '#eef3f9' }}>
            <Box
              component="img"
              src={character.portrait}
              alt={character.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: character.portraitPosition ? `${character.portraitPosition.x}% ${character.portraitPosition.y}%` : 'center 20%', display: 'block' }}
            />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(20,31,52,.7) 100%)' }} />
            <Typography sx={{ position: 'absolute', left: 15, bottom: 12, color: '#fff', fontSize: { xs: 25, md: 30 }, fontWeight: 950, textShadow: '0 2px 8px rgba(0,0,0,.35)' }}>
              {character.name}
            </Typography>
          </Box>

          <Stack spacing={1.2} sx={{ p: { xs: 1.5, md: 1.8 } }}>
            <Stack direction="row" spacing={.8} flexWrap="wrap" useFlexGap>
              <StatChip icon={<EditNoteIcon />} label="Design" value={character.stats.design} />
              <StatChip icon={<SubjectIcon />} label="Text" value={character.stats.text} />
              <StatChip icon={<LayersIcon />} label="AA" value={character.stats.aa} />
            </Stack>
            {!!character.tags?.length && (
              <Box>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 850, mb: .55 }}>標籤</Typography>
                <Stack direction="row" spacing={.55} flexWrap="wrap" useFlexGap>
                  {character.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={getCharacterTagName(tag)}
                      size="small"
                      sx={{
                        height: 22,
                        bgcolor: '#fff7fa',
                        border: '1px solid #f2bfd0',
                        color: '#8b3f58',
                        fontSize: 10.5,
                        fontWeight: 850,
                        '& .MuiChip-label': { px: .8 },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 850, mb: .65 }}>技能</Typography>
              <Stack spacing={.75}>
                {skills.map((skill) => (
                  <Box
                    key={skill.id}
                    sx={{
                      px: 1,
                      py: .8,
                      border: '1px solid #d9e2ee',
                      borderRadius: 2,
                      bgcolor: '#f8fbff',
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 950, lineHeight: 1.25 }}>
                      {skill.name}
                    </Typography>
                    <Typography sx={{ mt: .3, fontSize: 11.25, color: 'text.secondary', fontWeight: 650, lineHeight: 1.45 }}>
                      {skill.description}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            {selected && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  px: 1,
                  py: .35,
                  borderRadius: 999,
                  bgcolor: '#ff7098',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 950,
                  boxShadow: '0 4px 12px rgba(229,79,122,.28)',
                }}
              >
                {selectedLabel}
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Chip
      icon={icon as React.ReactElement}
      label={`${label} ${value}`}
      variant="outlined"
      sx={{ fontWeight: 900, bgcolor: '#fbfdff', '& .MuiChip-icon': { fontSize: 17 } }}
    />
  );
}