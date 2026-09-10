import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { CHARACTERS, SKILLS } from '../content/catalog';
import { getCharacterTagName } from '../content/characterTags';

export function CharacterRosterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const characters = Object.values(CHARACTERS);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeIcon sx={{ color: '#f4ba45' }} />
          <Box>
            <Typography variant="h6">角色卡資料</Typography>
            <Typography variant="caption" color="text.secondary">
              Discussion roster · 已明確記錄的數值與技能優先；缺漏欄位會標示 prototype default
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#fffdf8' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.25,
          }}
        >
          {characters.map((character) => {
            const boss = character.tags?.includes('boss');
            const portraitPosition = character.portraitPosition
              ? `${character.portraitPosition.x}% ${character.portraitPosition.y}%`
              : 'center 20%';
            const visibleTags = (character.tags ?? [])
              .filter((tag) => tag !== 'boss')
              .map((tag) => getCharacterTagName(tag));
            return (
              <Card key={character.id} sx={{ overflow: 'hidden', borderColor: boss ? '#d2a84a' : '#dfe8f4' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: character.portrait ? '126px minmax(0,1fr)' : '1fr', minHeight: 176 }}>
                  {character.portrait && (
                    <CardMedia
                      component="img"
                      image={character.portrait}
                      alt={character.name}
                      sx={{ width: 126, height: '100%', objectFit: 'cover', objectPosition: portraitPosition }}
                    />
                  )}
                  <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 }, minWidth: 0 }}>
                    <Stack direction="row" spacing={.6} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography sx={{ fontSize: 18, fontWeight: 950 }}>{character.name}</Typography>
                      {boss && <Chip size="small" label="Boss" color="warning" variant="outlined" />}
                      {visibleTags.map((label) => (
                        <Chip key={label} size="small" label={label} variant="outlined" />
                      ))}
                    </Stack>

                    <Stack direction="row" spacing={1.2} sx={{ mt: .8 }} flexWrap="wrap" useFlexGap>
                      <Stat label="Design" value={character.stats.design} tone="#ff6f98" />
                      <Stat label="Text" value={character.stats.text} tone="#4f8fe6" />
                      <Stat label="AA" value={character.stats.aa} tone="#43c6b4" />
                    </Stack>

                    <Stack direction="row" spacing={.6} sx={{ mt: .9 }} flexWrap="wrap" useFlexGap>
                      {character.resource ? (
                        <>
                          <Chip size="small" label={`${character.resource.name} ${character.resource.initial}/${character.resource.max}`} />
                          <Chip size="small" label="無壓力條" variant="outlined" />
                        </>
                      ) : (
                        <Chip size="small" label={`Stress ${character.maxStress === null ? '∞' : character.maxStress}`} />
                      )}
                    </Stack>

                    {character.affinities.length > 0 && (
                      <Typography sx={{ mt: .7, fontSize: 11, color: 'text.secondary' }}>
                        適性：{character.affinities.join(' / ')}
                      </Typography>
                    )}
                  </CardContent>
                </Box>

                <Divider />
                <Box sx={{ p: 1.1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, mb: .55 }}>技能</Typography>
                  <Stack spacing={.55}>
                    {character.skillIds.map((skillId) => {
                      const skill = SKILLS[skillId];
                      if (!skill) return null;
                      return (
                        <Box key={skillId}>
                          <Stack direction="row" spacing={.6} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{skill.name}</Typography>
                            <Chip
                              size="small"
                              label={skill.status === 'implemented' ? '已實裝' : skill.status === 'partial' ? '部分實裝' : '規劃中'}
                              color={skill.status === 'implemented' ? 'success' : skill.status === 'partial' ? 'warning' : 'default'}
                              variant="outlined"
                              sx={{ height: 20, '& .MuiChip-label': { px: .7, fontSize: 9 } }}
                            />
                          </Stack>
                          <Typography sx={{ mt: .15, fontSize: 10.5, color: 'text.secondary', lineHeight: 1.45 }}>
                            {skill.description}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>

                  {!!character.sourceNotes?.length && (
                    <>
                      <Divider sx={{ my: .85, borderStyle: 'dashed' }} />
                      <Typography sx={{ fontSize: 10, fontWeight: 900, color: '#70809a' }}>紀錄註記</Typography>
                      {character.sourceNotes.map((note) => (
                        <Typography key={note} sx={{ fontSize: 9.5, color: '#7c899d', lineHeight: 1.45 }}>
                          · {note}
                        </Typography>
                      ))}
                    </>
                  )}
                </Box>
              </Card>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 9, fontWeight: 800, color: tone }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 950, lineHeight: 1 }}>{value}</Typography>
    </Box>
  );
}
