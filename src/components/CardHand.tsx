import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { CARDS } from '../content/catalog';
import type { CardInstance } from '../game/types';

export function CardHand({ hand, onPlay }: { hand: CardInstance[]; onPlay: (instance: CardInstance) => void }) {
  return (
    <Stack direction="row" spacing={1.2} sx={{ overflowX: 'auto', pb: 1 }}>
      {hand.map((instance) => {
        const card = CARDS[instance.cardId];
        if (!card) return null;
        const coordination = card.kind === 'coordination';
        return (
          <Card key={instance.instanceId} sx={{ minWidth: 185, maxWidth: 185, overflow: 'hidden' }}>
            <CardActionArea onClick={() => onPlay(instance)} sx={{ height: '100%' }}>
              {card.art && <CardMedia component="img" image={card.art} alt={card.name} sx={{ height: 112, objectFit: 'cover', objectPosition: 'center 15%' }} />}
              <CardContent sx={{ p: 1.2 }}>
                <Chip
                  size="small"
                  icon={coordination ? <HandshakeIcon /> : <ErrorOutlineIcon />}
                  label={coordination ? '統籌' : '事件'}
                  color={coordination ? 'success' : 'secondary'}
                  sx={{ mb: 0.8 }}
                />
                <Typography variant="subtitle1">{card.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {card.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}
      {!hand.length && <Box><Typography color="text.secondary">手牌為空。</Typography></Box>}
    </Stack>
  );
}
