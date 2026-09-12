import { Box, Stack, Typography } from '@mui/material';
import type { TargetCandidate } from '../game/targeting';
import type { DieToken as DieTokenModel } from '../game/types';
import { DieToken } from './DieToken';

interface DiceSelection {
  candidates: TargetCandidate[];
  onSelect: (dieId: string) => void;
  onCancel: () => void;
}

interface Props {
  dice: DieTokenModel[];
  selectedDieId?: string;
  onSelect: (dieId: string) => void;
  selection?: DiceSelection;
}

export function DiceTray({ dice, selectedDieId, onSelect, selection }: Props) {
  if (!dice.length) {
    return <Typography variant="body2" color="text.secondary">目前沒有待分配骰。</Typography>;
  }

  const candidateMap = new Map(selection?.candidates.map((candidate) => [candidate.id, candidate]) ?? []);

  return (
    <Stack
      direction="row"
      gap={.8}
      flexWrap="wrap"
      sx={selection ? { position: 'relative', zIndex: 1210 } : undefined}
    >
      {dice.map((die, index) => {
        const candidate = selection ? candidateMap.get(die.id) : undefined;
        const allowed = !!candidate?.allowed;
        const hint = candidate?.warning ?? candidate?.reason ?? (allowed ? '點擊以指定此骰' : '不可指定；點擊取消');
        return (
          <Box
            key={die.id}
            data-tutorial={`die-${die.ownerId}-${die.skill}`}
            title={selection ? hint : undefined}
            sx={{
              borderRadius: 2,
              opacity: selection && !allowed ? .3 : 1,
              outline: selection && allowed ? '4px solid rgba(255,180,59,.95)' : '4px solid transparent',
              outlineOffset: 2,
              transition: 'opacity .15s ease, outline-color .15s ease',
            }}
          >
            <DieToken
              die={die}
              selected={die.id === selectedDieId}
              rotation={index % 2 ? 2 : -2}
              onSelect={selection
                ? () => allowed ? selection.onSelect(die.id) : selection.onCancel()
                : onSelect}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
