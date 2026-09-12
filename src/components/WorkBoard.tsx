import { Box } from '@mui/material';
import type { TargetCandidate, TargetLegality } from '../game/targeting';
import type { DieToken, WorkState } from '../game/types';
import { WorkCard } from './WorkCard';

interface WorkSelection {
  candidates: TargetCandidate[];
  onSelect: (workId: string) => void;
  onCancel: () => void;
}

interface SlotSelection {
  getLegality: (work: WorkState, slotIndex: number) => TargetLegality;
  onSelect: (workId: string, slotIndex: number) => void;
  onCancel: () => void;
}

interface Props {
  works: WorkState[];
  selectedDie?: DieToken;
  onSlotClick?: (workId: string, slotIndex: number) => void;
  workSelection?: WorkSelection;
  slotSelection?: SlotSelection;
}

export function WorkBoard({ works, selectedDie, onSlotClick, workSelection, slotSelection }: Props) {
  const candidateMap = new Map(workSelection?.candidates.map((candidate) => [candidate.id, candidate]) ?? []);
  const targeting = !!workSelection || !!slotSelection;

  return (
    <Box
      sx={{
        position: targeting ? 'relative' : undefined,
        zIndex: targeting ? 1210 : undefined,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: `repeat(${Math.min(3, Math.max(1, works.length))}, minmax(0,1fr))`,
        },
        gap: 1.15,
      }}
    >
      {works.map((work, index) => {
        const candidate = workSelection ? candidateMap.get(work.id) : undefined;
        const workAllowed = !!candidate?.allowed;
        const workHint = candidate?.warning ?? candidate?.reason ?? (workAllowed ? '點擊以指定此作品' : '不可指定；點擊取消');
        return (
          <Box
            key={work.id}
            data-feedback-anchor={`work:${work.id}`}
            data-tutorial={`work-${work.ownerId}`}
            sx={{
              position: 'relative',
              opacity: workSelection && !workAllowed ? .34 : 1,
              outline: workSelection && workAllowed ? '4px solid rgba(255,180,59,.95)' : '4px solid transparent',
              outlineOffset: 3,
              borderRadius: 2,
              transition: 'opacity .15s ease, outline-color .15s ease',
            }}
          >
            <WorkCard
              work={work}
              index={index}
              selectedDie={selectedDie}
              onSlotClick={slotSelection?.onSelect ?? onSlotClick}
              getSlotLegality={slotSelection ? (slotIndex) => slotSelection.getLegality(work, slotIndex) : undefined}
              onCancelSelection={slotSelection?.onCancel}
            />
            {workSelection && (
              <Box
                component="button"
                type="button"
                aria-label={workHint}
                title={workHint}
                onClick={() => workAllowed ? workSelection.onSelect(work.id) : workSelection.onCancel()}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  border: 0,
                  borderRadius: 2,
                  bgcolor: workAllowed ? 'rgba(255,196,72,.06)' : 'rgba(40,48,62,.08)',
                  cursor: workAllowed ? 'pointer' : 'default',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
