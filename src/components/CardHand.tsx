import { Box, Stack, Typography } from '@mui/material';
import { CARDS } from '../content/catalog';
import type { CardInstance } from '../game/types';
import { HandCard } from './HandCard';

interface Props {
  hand: CardInstance[];
  onPlay: (instance: CardInstance) => void;
  getDisabledReason?: (instance: CardInstance) => string | undefined;
}

export function CardHand({ hand, onPlay, getDisabledReason }: Props) {
  return (
    <Stack direction="row" spacing={.9} sx={{ overflowX: 'auto', pb: .6 }}>
      {hand.map((instance, index) => {
        const card = CARDS[instance.cardId];
        if (!card) return null;
        return (
          <Box key={instance.instanceId} data-tutorial={`card-${card.id}`} sx={{ flexShrink: 0 }}>
            <HandCard
              instance={instance}
              card={card}
              rotation={index % 2 ? 1 : -1}
              onPlay={onPlay}
              disabledReason={getDisabledReason?.(instance)}
            />
          </Box>
        );
      })}
      {!hand.length && <Box><Typography color="text.secondary">手牌為空。</Typography></Box>}
    </Stack>
  );
}
