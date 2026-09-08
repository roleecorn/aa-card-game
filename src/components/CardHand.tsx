import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { CARDS } from '../content/catalog';
import type { CardInstance } from '../game/types';

export function CardHand({ hand, onPlay }: { hand: CardInstance[]; onPlay: (instance: CardInstance) => void }) {
  return (
    <Stack direction="row" spacing={.9} sx={{ overflowX: 'auto', pb: .6 }}>
      {hand.map((instance, index) => {
        const card = CARDS[instance.cardId];
        if (!card) return null;
        const coordination = card.kind === 'coordination';
        const tone = coordination ? '#48c6b5' : '#ff6f8f';
        return (
          <Card key={instance.instanceId} sx={{ minWidth: 150, maxWidth: 150, overflow: 'hidden', borderColor: tone, borderWidth: 2, bgcolor: coordination ? '#f5fffd' : '#fff7f9', transform: `rotate(${index % 2 ? 1 : -1}deg)` }}>
            <CardActionArea onClick={() => onPlay(instance)} sx={{ height: '100%' }}>
              {card.art && (
                <Box sx={{ position: 'relative', height: 82, overflow: 'hidden' }}>
                  <CardMedia component="img" image={card.art} alt={card.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />
                  <Chip
                    size="small"
                    icon={coordination ? <HandshakeIcon /> : <ErrorOutlineIcon />}
                    label={coordination ? '支援卡' : '事件卡'}
                    sx={{ position: 'absolute', left: 6, top: 6, height: 23, bgcolor: 'rgba(255,255,255,.93)', border: `1px solid ${tone}`, color: '#26334d' }}
                  />
                </Box>
              )}
              <CardContent sx={{ p: .9, '&:last-child': { pb: .9 } }}>
                <Typography sx={{ fontSize: 13.5, lineHeight: 1.1, fontWeight: 950 }}>{card.name}</Typography>
                <Typography sx={{ mt: .45, fontSize: 10.5, color: 'text.secondary', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
