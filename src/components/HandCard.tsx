import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Tooltip, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { CardDefinition } from '../game/schema';
import type { CardInstance } from '../game/types';

export interface HandCardProps {
  instance: CardInstance;
  card: CardDefinition;
  rotation?: number;
  onPlay?: (instance: CardInstance) => void;
  disabledReason?: string;
}

export function HandCard({ instance, card, rotation = 0, onPlay, disabledReason }: HandCardProps) {
  const coordination = card.kind === 'coordination';
  const tone = coordination ? '#48c6b5' : '#ff6f8f';
  const disabled = !onPlay || !!disabledReason;

  const body = (
    <Card
      sx={{
        minWidth: 150,
        maxWidth: 150,
        overflow: 'hidden',
        borderColor: tone,
        borderWidth: 2,
        bgcolor: coordination ? '#f5fffd' : '#fff7f9',
        transform: `rotate(${rotation}deg)`,
        opacity: disabledReason ? .45 : 1,
      }}
    >
      <CardActionArea
        disabled={disabled}
        onClick={() => onPlay?.(instance)}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box
          sx={{
            minHeight: 32,
            px: .7,
            py: .45,
            display: 'flex',
            alignItems: 'center',
            bgcolor: coordination ? '#e8fbf7' : '#fff0f4',
            borderBottom: '1px solid',
            borderColor: tone,
          }}
        >
          <Chip
            size="small"
            icon={coordination ? <HandshakeIcon /> : <ErrorOutlineIcon />}
            label={coordination ? '支援卡' : '事件卡'}
            sx={{
              height: 23,
              bgcolor: '#fff',
              border: `1px solid ${tone}`,
              color: '#26334d',
              '& .MuiChip-label': { px: .7, fontWeight: 800 },
              '& .MuiChip-icon': { ml: .45 },
            }}
          />
        </Box>

        {card.art && (
          <Box
            sx={{
              width: '100%',
              aspectRatio: '8 / 5',
              overflow: 'hidden',
              bgcolor: '#fff',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardMedia
              component="img"
              image={card.art}
              alt={card.name}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
              }}
            />
          </Box>
        )}

        <CardContent sx={{ p: .9, '&:last-child': { pb: .9 } }}>
          <Typography sx={{ fontSize: 13.5, lineHeight: 1.1, fontWeight: 950 }}>{card.name}</Typography>
          <Typography
            sx={{
              mt: .45,
              fontSize: 10.5,
              color: 'text.secondary',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {card.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return disabledReason ? (
    <Tooltip title={disabledReason} arrow>
      <Box component="span" sx={{ display: 'inline-block' }}>{body}</Box>
    </Tooltip>
  ) : body;
}
