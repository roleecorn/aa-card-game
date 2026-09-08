import { Box, Stack, Typography } from '@mui/material';
import { CARDS } from '../content/catalog';
import type { CardInstance } from '../game/types';
import { HandCard } from './HandCard';

export function CardHand({ hand, onPlay }: { hand: CardInstance[]; onPlay: (instance: CardInstance) => void }) {
  return (
    <Stack direction="row" spacing={.9} sx={{ overflowX: 'auto', pb: .6 }}>
      {hand.map((instance, index) => {
        const card = CARDS[instance.cardId];
        if (!card) return null;
        return (
          <HandCard
            key={instance.instanceId}
            instance={instance}
            card={card}
            rotation={index % 2 ? 1 : -1}
            onPlay={onPlay}
          />
        );
      })}
      {!hand.length && <Box><Typography color="text.secondary">手牌為空。</Typography></Box>}
    </Stack>
  );
}
