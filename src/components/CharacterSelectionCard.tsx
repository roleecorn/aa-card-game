import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SubjectIcon from '@mui/icons-material/Subject';
import LayersIcon from '@mui/icons-material/Layers';
import type { CharacterDefinition } from '../game/schema';
import { SKILLS } from '../content/catalog';
import { getCharacterTagName } from '../content/characterTags';
import { CharacterAffinities } from './CharacterAffinities';

interface Props {
  character: CharacterDefinition;
  selected?: boolean;
  selectedLabel?: string;
  interactive?: boolean;
  dimmed?: boolean;
  variant?: 'full' | 'rail';
  onClick?: () => void;
}

/**
 * Revealed character card used by pre-match selection screens.
 * `full` follows the existing "你的初始隊伍" card layout: large portrait,
 * stats, affinities, tags, and visible skill descriptions. `rail` keeps that
 * same vertical card language at a narrower size for already-picked teams.
 */
export function CharacterSelectionCard({
  character,
  selected = false,
  selectedLabel = '已選取',
  interactive = false,
  dimmed = false,
  variant = 'full',
  onClick,
}: Props) {
  const rail = variant === 'rail';
  const skills = character.skillIds
    .map((skillId) => SKILLS[skillId])
    .filter((skill): skill is NonNullable<typeof skill> => !!skill);

  return (
    <Paper
      onClick={() => interactive && onClick?.()}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: selected ? '3px solid #ff7098' : '2px solid #d5dfec',
        boxShadow: selected
          ? '0 0 0 5px rgba(255,112,152,.13), 0 18px 42px rgba(42,63,99,.17)'
          : rail
          ? '0 8px 22px rgba(42,63,99,.11)'
          : '0 18px 42px rgba(42,63,99,.13)',
        bgcolor: '#fff',
        cursor: interactive ? 'pointer' : 'default',
        opacity: dimmed ? .48 : 1,
        minHeight: rail ? 0 : { xs: 540, md: 590 },
        transition: 'border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease, transform 180ms ease',
        '&:hover': interactive ? { transform: 'translateY(-3px)' } : undefined,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: rail ? { xs: 150, lg: 138, xl: 158 } : { xs: 245, md: 265 },
          overflow: 'hidden',
          bgcolor: '#eef3f9',
        }}
      >
        <Box
          component="img"
          src={character.portrait}
          alt={character.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: character.portraitPosition
              ? `${character.portraitPosition.x}% ${character.portraitPosition.y}%`
              : 'center 20%',
            display: 'block',
          }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(20,31,52,.7) 100%)' }} />
        <Typography
          sx={{
            position: 'absolute',
            left: rail ? 10 : 15,
            bottom: rail ? 8 : 12,
            color: '#fff',
            fontSize: rail ? { xs: 18, xl: 20 } : { xs: 25, md: 30 },
            fontWeight: 950,
            textShadow: '0 2px 8px rgba(0,0,0,.35)',
          }}
        >
          {character.name}
        </Typography>
      </Box>

      <Stack spacing={rail ? .75 : 1.2} sx={{ p: rail ? 1 : { xs: 1.5, md: 1.8 } }}>
        <Stack direction="row" spacing={rail ? .45 : .8} flexWrap="wrap" useFlexGap>
          <StatChip icon={<EditNoteIcon />} label="Design" value={character.stats.design} compact={rail} />
          <StatChip icon={<SubjectIcon />} label="Text" value={character.stats.text} compact={rail} />
          <StatChip icon={<LayersIcon />} label="AA" value={character.stats.aa} compact={rail} />
        </Stack>
        <CharacterAffinities affinities={character.affinities} compact={rail} />

        {!!character.tags?.length && (
          <Box>
            <Typography sx={{ fontSize: rail ? 9.5 : 10.5, color: 'text.secondary', fontWeight: 850, mb: rail ? .35 : .55 }}>標籤</Typography>
            <Stack direction="row" spacing={.45} flexWrap="wrap" useFlexGap>
              {character.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={getCharacterTagName(tag)}
                  size="small"
                  sx={{
                    height: rail ? 19 : 22,
                    bgcolor: '#fff7fa',
                    border: '1px solid #f2bfd0',
                    color: '#8b3f58',
                    fontSize: rail ? 9 : 10.5,
                    fontWeight: 850,
                    '& .MuiChip-label': { px: rail ? .55 : .8 },
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography sx={{ fontSize: rail ? 9.5 : 10.5, color: 'text.secondary', fontWeight: 850, mb: rail ? .4 : .65 }}>技能</Typography>
          <Stack spacing={rail ? .45 : .75}>
            {skills.map((skill) => (
              <Box
                key={skill.id}
                sx={{
                  px: rail ? .7 : 1,
                  py: rail ? .55 : .8,
                  border: '1px solid #d9e2ee',
                  borderRadius: 2,
                  bgcolor: '#f8fbff',
                }}
              >
                <Typography sx={{ fontSize: rail ? 10.5 : 12.5, fontWeight: 950, lineHeight: 1.25 }}>
                  {skill.name}
                </Typography>
                <Typography sx={{ mt: .25, fontSize: rail ? 9.5 : 11.25, color: 'text.secondary', fontWeight: 650, lineHeight: 1.4 }}>
                  {skill.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>

      {selected && (
        <Box
          sx={{
            position: 'absolute',
            top: rail ? 7 : 10,
            right: rail ? 7 : 10,
            px: rail ? .7 : 1,
            py: rail ? .25 : .35,
            borderRadius: 999,
            bgcolor: '#ff7098',
            color: '#fff',
            fontSize: rail ? 9.5 : 11,
            fontWeight: 950,
            boxShadow: '0 4px 12px rgba(229,79,122,.28)',
          }}
        >
          {selectedLabel}
        </Box>
      )}
    </Paper>
  );
}

function StatChip({ icon, label, value, compact }: { icon: React.ReactNode; label: string; value: number; compact?: boolean }) {
  return (
    <Chip
      icon={icon as React.ReactElement}
      label={`${label} ${value}`}
      variant="outlined"
      sx={{
        height: compact ? 25 : 32,
        fontSize: compact ? 10.5 : 13,
        fontWeight: 900,
        bgcolor: '#fbfdff',
        '& .MuiChip-icon': { fontSize: compact ? 14 : 17 },
        '& .MuiChip-label': { px: compact ? .7 : 1.1 },
      }}
    />
  );
}
