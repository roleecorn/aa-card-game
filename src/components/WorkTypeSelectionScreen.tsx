import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import type { GameDefinition } from '../game/gameDefinition';
import { getInitialWorkTypeChoices } from '../game/engine';
import type { CharacterDefinition, WorkType } from '../game/schema';

interface Props {
  characters: CharacterDefinition[];
  gameDefinition: GameDefinition;
  onConfirm: (selections: Record<string, WorkType>) => void;
  submitted?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

function defaultSelections(characters: CharacterDefinition[], gameDefinition: GameDefinition): Record<string, WorkType> {
  return Object.fromEntries(characters.flatMap((character) => {
    const first = getInitialWorkTypeChoices(character.id, gameDefinition)[0];
    return first ? [[character.id, first] as const] : [];
  }));
}

export function WorkTypeSelectionScreen({
  characters,
  gameDefinition,
  onConfirm,
  submitted = false,
  title = '選擇作品初始類型',
  description = '每名角色從自己的作品適性中選擇本局起始類型。作品之後仍可能被技能追加或改變類型。',
  confirmLabel = '確認作品類型',
}: Props) {
  const rosterKey = characters.map((character) => character.id).join('|');
  const defaults = useMemo(
    () => defaultSelections(characters, gameDefinition),
    [characters, gameDefinition],
  );
  const [selections, setSelections] = useState<Record<string, WorkType>>(defaults);

  useEffect(() => {
    setSelections(defaults);
  }, [defaults, rosterKey]);

  const complete = characters.every((character) => !!selections[character.id]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 1.5, md: 3 },
        py: { xs: 3, md: 5 },
        bgcolor: '#f7f9fd',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2.5} sx={{ width: 'min(1120px, 100%)' }}>
        <Stack alignItems="center" spacing={0.6} textAlign="center">
          <CategoryRoundedIcon fontSize="large" />
          <Typography variant="h4" fontWeight={950}>{title}</Typography>
          <Typography color="text.secondary" fontWeight={650}>{description}</Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(Math.max(characters.length, 1), 3)}, minmax(0, 1fr))` },
            gap: 2,
          }}
        >
          {characters.map((character) => {
            const choices = getInitialWorkTypeChoices(character.id, gameDefinition);
            const selected = selections[character.id];
            return (
              <Card key={character.id} variant="outlined" sx={{ minWidth: 0 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.3} alignItems="center">
                      <Box
                        component="img"
                        src={character.compactPortrait ?? character.portrait}
                        alt=""
                        sx={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 2, flex: '0 0 auto' }}
                      />
                      <Box minWidth={0}>
                        <Typography fontWeight={950} noWrap>{character.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          初始作品類型
                        </Typography>
                      </Box>
                    </Stack>

                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={selected ?? null}
                      disabled={submitted}
                      onChange={(_, value: WorkType | null) => {
                        if (!value) return;
                        setSelections((current) => ({ ...current, [character.id]: value }));
                      }}
                      aria-label={`${character.name} 作品初始類型`}
                    >
                      {choices.map((type) => (
                        <ToggleButton key={type} value={type} aria-label={type} sx={{ fontWeight: 900 }}>
                          {type}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>

                    {choices.length === 1 && (
                      <Typography variant="caption" color="text.secondary">
                        此角色目前只有一個可用的初始類型。
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Stack alignItems="center" spacing={1}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CheckCircleRoundedIcon />}
            disabled={!complete || submitted}
            onClick={() => onConfirm(selections)}
            sx={{ minWidth: 220, fontWeight: 950 }}
          >
            {submitted ? '已送出，等待對手' : confirmLabel}
          </Button>
          {submitted && (
            <Typography variant="body2" color="text.secondary">
              對局會在雙方都確認作品類型後開始。
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
