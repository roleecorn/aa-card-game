import { Box } from '@mui/material';
import type { DieToken, WorkState } from '../game/types';
import { WorkCard } from './WorkCard';

interface Props {
  works: WorkState[];
  selectedDie?: DieToken;
  onSlotClick?: (workId: string, slotIndex: number) => void;
}

export function WorkBoard({ works, selectedDie, onSlotClick }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: `repeat(${Math.min(3, Math.max(1, works.length))}, minmax(0,1fr))`,
        },
        gap: 1.15,
      }}
    >
      {works.map((work, index) => (
        <Box key={work.id} data-tutorial={`work-${work.ownerId}`}>
          <WorkCard
            work={work}
            index={index}
            selectedDie={selectedDie}
            onSlotClick={onSlotClick}
          />
        </Box>
      ))}
    </Box>
  );
}