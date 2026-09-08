import { Stack, Typography } from '@mui/material';
import type { DieToken as DieTokenModel } from '../game/types';
import { DieToken } from './DieToken';

interface Props {
  dice: DieTokenModel[];
  selectedDieId?: string;
  onSelect: (dieId: string) => void;
}

export function DiceTray({ dice, selectedDieId, onSelect }: Props) {
  if (!dice.length) {
    return <Typography variant="body2" color="text.secondary">目前沒有待分配骰。</Typography>;
  }

  return (
    <Stack direction="row" gap={.8} flexWrap="wrap">
      {dice.map((die, index) => (
        <DieToken
          key={die.id}
          die={die}
          selected={die.id === selectedDieId}
          rotation={index % 2 ? 2 : -2}
          onSelect={onSelect}
        />
      ))}
    </Stack>
  );
}
