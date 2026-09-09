import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { CARDS } from '../content/catalog';
import { DEFAULT_MATCH } from '../content/match';
import type { CardInstance } from '../game/types';
import { HandCard } from './HandCard';

interface Props {
  hand: CardInstance[];
  onDiscard: (instanceIds: string[]) => void;
}

export function HandLimitDialog({ hand, onDiscard }: Props) {
  const excess = Math.max(0, hand.length - DEFAULT_MATCH.handLimit);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => hand.some((card) => card.instanceId === id)).slice(0, excess),
    );
  }, [hand, excess]);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (instanceId: string) => {
    setSelectedIds((current) => {
      if (current.includes(instanceId)) return current.filter((id) => id !== instanceId);
      if (current.length >= excess) return current;
      return [...current, instanceId];
    });
  };

  if (excess <= 0) return null;

  return (
    <Dialog open disableEscapeKeyDown maxWidth="lg" fullWidth>
      <DialogTitle>手牌超過上限</DialogTitle>
      <DialogContent>
        <Stack spacing={1.4}>
          <Typography color="text.secondary">
            手牌上限為 {DEFAULT_MATCH.handLimit} 張。請選擇棄掉 {excess} 張牌，直到手牌剩下 {DEFAULT_MATCH.handLimit} 張。
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 1.2,
              alignItems: 'start',
            }}
          >
            {hand.map((instance, index) => {
              const card = CARDS[instance.cardId];
              if (!card) return null;
              const isSelected = selected.has(instance.instanceId);
              return (
                <Box
                  key={instance.instanceId}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: .5,
                    borderRadius: 2,
                    outline: isSelected ? '3px solid #e85d7f' : '3px solid transparent',
                    bgcolor: isSelected ? 'rgba(232,93,127,.08)' : 'transparent',
                  }}
                >
                  <HandCard
                    instance={instance}
                    card={card}
                    rotation={index % 2 ? .5 : -.5}
                    onPlay={() => toggle(instance.instanceId)}
                  />
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ fontWeight: 800 }}>
            已選 {selectedIds.length} / {excess} 張
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="error"
          disabled={selectedIds.length !== excess}
          onClick={() => onDiscard(selectedIds)}
        >
          棄牌並繼續
        </Button>
      </DialogActions>
    </Dialog>
  );
}
