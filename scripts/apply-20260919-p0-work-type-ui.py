from pathlib import Path


def read(file: str) -> str:
    return Path(file).read_text(encoding='utf-8')


def write(file: str, text: str) -> None:
    Path(file).write_text(text, encoding='utf-8')


def rep(file: str, old: str, new: str, count: int = 1) -> None:
    text = read(file)
    if old not in text:
        raise SystemExit(f'expected snippet not found in {file}: {old[:140]!r}')
    write(file, text.replace(old, new, count))


def append_once(file: str, marker: str, block: str) -> None:
    text = read(file)
    if marker in text:
        return
    write(file, text.rstrip() + '\n\n' + block.strip() + '\n')


# Engine: one shared source of truth for initial work-type choices, including the existing no-affinity fallback.
rep(
    'src/game/engine.ts',
    """function chooseWorkType(engine: EngineSession, memberId: string): WorkType {
  const definition = engine.content.characters[memberId];
  if (!definition) throw new Error(`Unknown character ${memberId}`);
  const candidates = characterWorkTypes(definition, engine.content);
  if (!candidates.length) return '謀';
  return candidates[Math.floor(engine.random() * candidates.length)] ?? candidates[0] ?? '謀';
}

export function getInitialWorkTypeChoices(
  memberId: string,
  gameDefinition: GameDefinition = STANDARD_GAME_DEFINITION,
): WorkType[] {
  const definition = gameDefinition.content.characters[memberId];
  if (!definition) throw new Error(`Unknown character ${memberId}`);
  return characterWorkTypes(definition, gameDefinition.content);
}""",
    """function initialWorkTypeChoices(definition: CharacterDefinition, content: GameContent): WorkType[] {
  const candidates = characterWorkTypes(definition, content);
  return candidates.length ? candidates : ['謀'];
}

function chooseWorkType(engine: EngineSession, memberId: string): WorkType {
  const definition = engine.content.characters[memberId];
  if (!definition) throw new Error(`Unknown character ${memberId}`);
  const candidates = initialWorkTypeChoices(definition, engine.content);
  return candidates[Math.floor(engine.random() * candidates.length)] ?? candidates[0] ?? '謀';
}

export function getInitialWorkTypeChoices(
  memberId: string,
  gameDefinition: GameDefinition = STANDARD_GAME_DEFINITION,
): WorkType[] {
  const definition = gameDefinition.content.characters[memberId];
  if (!definition) throw new Error(`Unknown character ${memberId}`);
  return initialWorkTypeChoices(definition, gameDefinition.content);
}""",
)
rep(
    'src/game/engine.ts',
    '      const legalTypes = characterWorkTypes(definition, engine.content);',
    '      const legalTypes = initialWorkTypeChoices(definition, engine.content);',
)

# Store: pass work-type choices into createInitialGame before gameStart triggers run.
rep(
    'src/store/gameStore.ts',
    "import type { TeamId } from '../game/schema';",
    "import type { TeamId, WorkType } from '../game/schema';",
)
rep(
    'src/store/gameStore.ts',
    """    playerLeaderId?: string,
    gameDefinition?: GameDefinition,
  ) => void;""",
    """    playerLeaderId?: string,
    gameDefinition?: GameDefinition,
    playerWorkTypes?: Partial<Record<string, WorkType>>,
    enemyWorkTypes?: Partial<Record<string, WorkType>>,
  ) => void;""",
)
rep(
    'src/store/gameStore.ts',
    '    startGame: (playerMemberIds, enemyMemberIds, requestedLeaderId, requestedGameDefinition) => set((state) => {',
    '    startGame: (playerMemberIds, enemyMemberIds, requestedLeaderId, requestedGameDefinition, playerWorkTypes, enemyWorkTypes) => set((state) => {',
)
rep(
    'src/store/gameStore.ts',
    """      state.game = createInitialGame(Math.random, gameDefinition, {
        playerMemberIds: orderedPlayerMemberIds,
        enemyMemberIds,
      });""",
    """      state.game = createInitialGame(Math.random, gameDefinition, {
        playerMemberIds: orderedPlayerMemberIds,
        enemyMemberIds,
        playerWorkTypes,
        enemyWorkTypes,
      });""",
)

# New reusable selection screen used by offline and online setup.
write('src/components/WorkTypeSelectionScreen.tsx', r'''import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import type { GameDefinition } from '../game/gameDefinition';
import { getInitialWorkTypeChoices } from '../game/engine';
import type { CharacterDefinition, WorkType } from '../game/schema';

interface Props {
  characters: CharacterDefinition[];
  gameDefinition: GameDefinition;
  onConfirm: (selections: Record<string, WorkType>) => void;
  submitted?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

function defaultSelections(characters: CharacterDefinition[], gameDefinition: GameDefinition): Record<string, WorkType> {
  return Object.fromEntries(characters.flatMap((character) => {
    const first = getInitialWorkTypeChoices(character.id, gameDefinition)[0];
    return first ? [[character.id, first] as const] : [];
  }));
}

export function WorkTypeSelectionScreen({
  characters,
  gameDefinition,
  onConfirm,
  submitted = false,
  title = '選擇作品初始類型',
  description = '每名角色從自己的作品適性中選擇本局起始類型。作品之後仍可能被技能追加或改變類型。',
  confirmLabel = '確認作品類型',
}: Props) {
  const rosterKey = characters.map((character) => character.id).join('|');
  const defaults = useMemo(
    () => defaultSelections(characters, gameDefinition),
    [characters, gameDefinition],
  );
  const [selections, setSelections] = useState<Record<string, WorkType>>(defaults);

  useEffect(() => {
    setSelections(defaults);
  }, [defaults, rosterKey]);

  const complete = characters.every((character) => !!selections[character.id]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 1.5, md: 3 },
        py: { xs: 3, md: 5 },
        bgcolor: '#f7f9fd',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2.5} sx={{ width: 'min(1120px, 100%)' }}>
        <Stack alignItems="center" spacing={0.6} textAlign="center">
          <CategoryRoundedIcon fontSize="large" />
          <Typography variant="h4" fontWeight={950}>{title}</Typography>
          <Typography color="text.secondary" fontWeight={650}>{description}</Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(Math.max(characters.length, 1), 3)}, minmax(0, 1fr))` },
            gap: 2,
          }}
        >
          {characters.map((character) => {
            const choices = getInitialWorkTypeChoices(character.id, gameDefinition);
            const selected = selections[character.id];
            return (
              <Card key={character.id} variant="outlined" sx={{ minWidth: 0 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.3} alignItems="center">
                      <Box
                        component="img"
                        src={character.compactPortrait ?? character.portrait}
                        alt=""
                        sx={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 2, flex: '0 0 auto' }}
                      />
                      <Box minWidth={0}>
                        <Typography fontWeight={950} noWrap>{character.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          初始作品類型
                        </Typography>
                      </Box>
                    </Stack>

                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={selected ?? null}
                      disabled={submitted}
                      onChange={(_, value: WorkType | null) => {
                        if (!value) return;
                        setSelections((current) => ({ ...current, [character.id]: value }));
                      }}
                      aria-label={`${character.name} 作品初始類型`}
                    >
                      {choices.map((type) => (
                        <ToggleButton key={type} value={type} aria-label={type} sx={{ fontWeight: 900 }}>
                          {type}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>

                    {choices.length === 1 && (
                      <Typography variant="caption" color="text.secondary">
                        此角色目前只有一個可用的初始類型。
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Stack alignItems="center" spacing={1}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CheckCircleRoundedIcon />}
            disabled={!complete || submitted}
            onClick={() => onConfirm(selections)}
            sx={{ minWidth: 220, fontWeight: 950 }}
          >
            {submitted ? '已送出，等待對手' : confirmLabel}
          </Button>
          {submitted && (
            <Typography variant="body2" color="text.secondary">
              對局會在雙方都確認作品類型後開始。
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
''')

# Protocol: negotiate work types before authoritative GameState creation.
rep(
    'src/online/protocol.ts',
    "import type { TeamId } from '../game/schema';",
    "import type { TeamId, WorkType } from '../game/schema';",
)
rep('src/online/protocol.ts', 'export const ONLINE_PROTOCOL_VERSION = 2;', 'export const ONLINE_PROTOCOL_VERSION = 3;')
rep(
    'src/online/protocol.ts',
    """  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'draftPick';
      characterId: string;
      teamName?: string;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'timeout';""",
    """  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'draftPick';
      characterId: string;
      teamName?: string;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'workTypes';
      selections: Record<string, WorkType>;
    }
  | {
      version: typeof ONLINE_PROTOCOL_VERSION;
      type: 'timeout';""",
)

# Online session: each side submits only its own selected work types; Host waits for both.
rep(
    'src/online/onlineSession.ts',
    "import { EngineSession } from '../game/engine';",
    "import { EngineSession, getInitialWorkTypeChoices } from '../game/engine';",
)
rep(
    'src/online/onlineSession.ts',
    "import type { TeamId } from '../game/schema';",
    "import type { TeamId, WorkType } from '../game/schema';",
)
rep(
    'src/online/onlineSession.ts',
    """type OnlineRole = 'host' | 'guest';
type OnlineStatus = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'closed' | 'error';

interface OnlineSessionStore {""",
    """type OnlineRole = 'host' | 'guest';
type OnlineStatus = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'closed' | 'error';

export interface OnlineWorkTypeSelections {
  host: Record<string, WorkType> | null;
  guest: Record<string, WorkType> | null;
}

interface OnlineSessionStore {""",
)
rep(
    'src/online/onlineSession.ts',
    """  draft: OnlineDraftState | null;
  localTeamName: string;""",
    """  draft: OnlineDraftState | null;
  workTypeSelections: OnlineWorkTypeSelections;
  localTeamName: string;""",
)
rep(
    'src/online/onlineSession.ts',
    """  pickDraftCharacter: (characterId: string) => boolean;
  sendCommand: (command: OnlineCommand) => boolean;""",
    """  pickDraftCharacter: (characterId: string) => boolean;
  submitWorkTypes: (selections: Record<string, WorkType>) => boolean;
  sendCommand: (command: OnlineCommand) => boolean;""",
)
# helper after broadcastDraft
rep(
    'src/online/onlineSession.ts',
    """function publishTimeoutNotice(title: string, message: string): void {""",
    """function normalizeWorkTypeSelections(
  side: OnlineDraftSide,
  requested: Record<string, WorkType>,
): Record<string, WorkType> | null {
  const draft = useOnlineSession.getState().draft;
  if (!draft || draft.status !== 'complete') return null;
  const memberIds = side === 'host' ? draft.hostPicks : draft.guestPicks;
  const normalized: Record<string, WorkType> = {};
  for (const memberId of memberIds) {
    const requestedType = requested[memberId];
    if (!requestedType || !getInitialWorkTypeChoices(memberId).includes(requestedType)) return null;
    normalized[memberId] = requestedType;
  }
  return normalized;
}

function publishTimeoutNotice(title: string, message: string): void {""",
)
# handle host message before guest draft branch
rep(
    'src/online/onlineSession.ts',
    """  if (role === 'guest' && message.type === 'draft') {""",
    """  if (role === 'host' && message.type === 'workTypes') {
    const normalized = normalizeWorkTypeSelections('guest', message.selections);
    if (!normalized) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '對手送出的作品類型設定無效。' });
      return;
    }
    useOnlineSession.setState((current) => ({
      workTypeSelections: { ...current.workTypeSelections, guest: normalized },
    }));
    return;
  }

  if (role === 'guest' && message.type === 'draft') {""",
)
# initial state
rep(
    'src/online/onlineSession.ts',
    """  draft: null,
  localTeamName: DEFAULT_TEAM_NAME,""",
    """  draft: null,
  workTypeSelections: { host: null, guest: null },
  localTeamName: DEFAULT_TEAM_NAME,""",
)
# create host reset
rep(
    'src/online/onlineSession.ts',
    """      draft: null,
      localTeamName,""",
    """      draft: null,
      workTypeSelections: { host: null, guest: null },
      localTeamName,""",
    1,
)
# guest reset second occurrence
rep(
    'src/online/onlineSession.ts',
    """      draft: null,
      localTeamName,""",
    """      draft: null,
      workTypeSelections: { host: null, guest: null },
      localTeamName,""",
    1,
)
# startHostDraft reset
rep(
    'src/online/onlineSession.ts',
    """      const draft = createOnlineDraft(state.teamSize, playableIds);
      set({ draft, timer: null, error: null });""",
    """      const draft = createOnlineDraft(state.teamSize, playableIds);
      set({ draft, workTypeSelections: { host: null, guest: null }, timer: null, error: null });""",
)
# submit action before sendCommand
rep(
    'src/online/onlineSession.ts',
    """  sendCommand: (command) => send({ version: ONLINE_PROTOCOL_VERSION, type: 'command', command }),""",
    """  submitWorkTypes: (selections) => {
    const state = get();
    if (!state.role || state.status !== 'connected' || !state.draft || state.draft.status !== 'complete') return false;
    const normalized = normalizeWorkTypeSelections(state.role, selections);
    if (!normalized) return false;
    if (state.role === 'guest') {
      const sent = send({ version: ONLINE_PROTOCOL_VERSION, type: 'workTypes', selections: normalized });
      if (!sent) return false;
      set({ workTypeSelections: { ...state.workTypeSelections, guest: normalized } });
      return true;
    }
    set({ workTypeSelections: { ...state.workTypeSelections, host: normalized } });
    return true;
  },

  sendCommand: (command) => send({ version: ONLINE_PROTOCOL_VERSION, type: 'command', command }),""",
)
# disconnect reset
rep(
    'src/online/onlineSession.ts',
    """      draft: null,
      remoteTeamName: null,""",
    """      draft: null,
      workTypeSelections: { host: null, guest: null },
      remoteTeamName: null,""",
)

# App: offline second setup step + online two-sided work-type negotiation.
rep(
    'src/app/App.tsx',
    "import { selectStandardRosters } from '../game/engine';",
    "import { selectStandardRosters } from '../game/engine';\nimport type { WorkType } from '../game/schema';",
)
rep(
    'src/app/App.tsx',
    "import { DrawPhaseScreen } from '../components/DrawPhaseScreen';",
    "import { DrawPhaseScreen } from '../components/DrawPhaseScreen';\nimport { WorkTypeSelectionScreen } from '../components/WorkTypeSelectionScreen';",
)
rep(
    'src/app/App.tsx',
    "type AppStage = 'start' | 'draw' | 'online-draft' | 'battle';",
    "type AppStage = 'start' | 'draw' | 'work-types' | 'online-draft' | 'online-work-types' | 'battle';",
)
rep(
    'src/app/App.tsx',
    """  enemy: string[];
  gameDefinition: GameDefinition;
}""",
    """  enemy: string[];
  gameDefinition: GameDefinition;
  leaderId?: string;
}""",
)
rep(
    'src/app/App.tsx',
    """  const onlineDraft = useOnlineSession((state) => state.draft);
  const onlineLocalTeamName = useOnlineSession((state) => state.localTeamName);""",
    """  const onlineDraft = useOnlineSession((state) => state.draft);
  const onlineWorkTypeSelections = useOnlineSession((state) => state.workTypeSelections);
  const submitOnlineWorkTypes = useOnlineSession((state) => state.submitWorkTypes);
  const onlineLocalTeamName = useOnlineSession((state) => state.localTeamName);""",
)
# stage routing effect
rep(
    'src/app/App.tsx',
    """    if (game) {
      setOnlineOpen(false);
      if (onlineDraft && !onlineDraftSettled) {
        setAppStage('online-draft');
        return;
      }
      setAppStage('battle');
      return;
    }
    if (onlineDraft) {
      setOnlineOpen(false);
      setAppStage('online-draft');
      return;
    }""",
    """    if (game) {
      setOnlineOpen(false);
      setAppStage('battle');
      return;
    }
    if (onlineDraft) {
      setOnlineOpen(false);
      setAppStage(onlineDraft.status === 'complete' && onlineDraftSettled ? 'online-work-types' : 'online-draft');
      return;
    }""",
)
# host game creation waits for both work-type submissions and passes them into createInitialGame
rep(
    'src/app/App.tsx',
    """      || !onlineDraftSettled
      || game
    ) return;""",
    """      || !onlineDraftSettled
      || !onlineWorkTypeSelections.host
      || !onlineWorkTypeSelections.guest
      || game
    ) return;""",
)
rep(
    'src/app/App.tsx',
    """      onlineDraft.hostPicks[0],
      selectedGameDefinition,
    );""",
    """      onlineDraft.hostPicks[0],
      selectedGameDefinition,
      onlineWorkTypeSelections.host,
      onlineWorkTypeSelections.guest,
    );""",
)
rep(
    'src/app/App.tsx',
    """  }, [broadcastCurrentGame, game, gameDefinition, onlineDraft, onlineDraftSettled, onlineLocalTeamName, onlineRemoteTeamName, onlineRole, onlineStatus, startGame]);""",
    """  }, [broadcastCurrentGame, game, gameDefinition, onlineDraft, onlineDraftSettled, onlineLocalTeamName, onlineRemoteTeamName, onlineRole, onlineStatus, onlineWorkTypeSelections, startGame]);""",
)
# offline roster confirm no longer starts immediately
rep(
    'src/app/App.tsx',
    """  const handleConfirmRoster = (leaderId: string) => {
    if (!draftRoster) return;
    startGame(draftRoster.player, draftRoster.enemy, leaderId, draftRoster.gameDefinition);
    setAppStage('battle');
  };""",
    """  const handleConfirmRoster = (leaderId: string) => {
    if (!draftRoster) return;
    setDraftRoster((current) => current ? { ...current, leaderId } : current);
    setAppStage('work-types');
  };

  const handleConfirmWorkTypes = (selections: Record<string, WorkType>) => {
    if (!draftRoster?.leaderId) return;
    startGame(
      draftRoster.player,
      draftRoster.enemy,
      draftRoster.leaderId,
      draftRoster.gameDefinition,
      selections,
    );
    setAppStage('battle');
  };""",
)
# offline work type stage before online branch
rep(
    'src/app/App.tsx',
    """  if (appStage === 'online-draft' && onlineDraft && onlineRole) {""",
    """  if (appStage === 'work-types' && draftRoster?.leaderId) {
    const workTypeCharacters = draftRoster.player.flatMap((memberId) => {
      const character = draftRoster.gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    return (
      <WorkTypeSelectionScreen
        characters={workTypeCharacters}
        gameDefinition={draftRoster.gameDefinition}
        onConfirm={handleConfirmWorkTypes}
      />
    );
  }

  if (appStage === 'online-draft' && onlineDraft && onlineRole) {""",
)
# online work type stage after online draft screen block, before battle block
needle = """  if (appStage === 'battle' && game) {"""
insert = """  if (appStage === 'online-work-types' && onlineDraft && onlineRole) {
    const localIds = onlineRole === 'host' ? onlineDraft.hostPicks : onlineDraft.guestPicks;
    const localCharacters = localIds.flatMap((memberId) => {
      const character = gameDefinition.content.characters[memberId];
      return character ? [character] : [];
    });
    const submitted = onlineRole === 'host'
      ? !!onlineWorkTypeSelections.host
      : !!onlineWorkTypeSelections.guest;
    return (
      <WorkTypeSelectionScreen
        characters={localCharacters}
        gameDefinition={gameDefinition}
        submitted={submitted}
        title="確認連線對局作品類型"
        description="請為自己隊伍的每名角色選擇初始作品類型。雙方都確認後才會建立對局。"
        confirmLabel="送出作品類型"
        onConfirm={(selections) => { submitOnlineWorkTypes(selections); }}
      />
    );
  }

""" + needle
rep('src/app/App.tsx', needle, insert)

# Regression tests: engine fallback, UI pre-game boundary, online protocol/state wiring.
write('src/tests/work-type-selection-ui.test.ts', r'''import { describe, expect, it } from 'vitest';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame, getInitialWorkTypeChoices } from '../game/engine';
import appSource from '../app/App.tsx?raw';
import screenSource from '../components/WorkTypeSelectionScreen.tsx?raw';
import storeSource from '../store/gameStore.ts?raw';
import protocolSource from '../online/protocol.ts?raw';
import sessionSource from '../online/onlineSession.ts?raw';


describe('initial work-type selection flow', () => {
  it('keeps the existing 謀 fallback for characters whose legacy data has no affinity yet', () => {
    expect(getInitialWorkTypeChoices('avocado')).toEqual(['謀']);
    const game = createInitialGame(() => 0.5, STANDARD_GAME_DEFINITION, {
      playerMemberIds: ['avocado', 'user79', 'meteor'],
      enemyMemberIds: ['pintbox', 'mashiro', 'happy'],
      playerWorkTypes: { avocado: '謀', user79: '燃', meteor: '燃' },
    });
    expect(game.player.works.find((work) => work.ownerId === 'avocado')?.type).toBe('謀');
  });

  it('collects work types before startGame so gameStart skills see the selected initial types', () => {
    expect(appSource).toContain("'work-types'");
    expect(appSource).toContain('<WorkTypeSelectionScreen');
    expect(appSource).toContain('handleConfirmWorkTypes');
    expect(storeSource).toContain('playerWorkTypes');
    expect(storeSource).toContain('enemyWorkTypes');
    expect(screenSource).toContain('getInitialWorkTypeChoices');
  });

  it('requires both online players to submit their own work types before Host creates the authoritative game', () => {
    expect(appSource).toContain("'online-work-types'");
    expect(appSource).toContain('onlineWorkTypeSelections.host');
    expect(appSource).toContain('onlineWorkTypeSelections.guest');
    expect(sessionSource).toContain('submitWorkTypes');
    expect(sessionSource).toContain("type: 'workTypes'");
    expect(protocolSource).toContain('ONLINE_PROTOCOL_VERSION = 3');
    expect(protocolSource).toContain("type: 'workTypes'");
  });
});
''')

# Existing online-draft source-boundary test should recognize the new setup stage.
rep(
    'src/tests/online-draft.test.ts',
    """    expect(appSource).toContain("'online-draft'");
    expect(appSource).toContain('<OnlineDraftScreen');
    expect(appSource).toContain('onlineDraft.hostPicks[0]');""",
    """    expect(appSource).toContain("'online-draft'");
    expect(appSource).toContain("'online-work-types'");
    expect(appSource).toContain('<OnlineDraftScreen');
    expect(appSource).toContain('<WorkTypeSelectionScreen');
    expect(appSource).toContain('onlineDraft.hostPicks[0]');""",
)

append_once(
    'GAME_MANUAL.md',
    '### 開局作品類型選擇',
    '''### 開局作品類型選擇

確認隊伍與組長後，正式建立對局前會先為每名角色選擇作品初始類型。可選項目來自該角色的有效作品適性；全適性角色可以選擇所有現行作品類型。舊資料若尚未定義任何適性，暫時沿用既有的「謀」fallback，直到角色資料校正完成。

連線對局中，Host 與 Guest 各自只選擇自己隊伍的作品類型；雙方都送出後，Host 才建立 authoritative GameState，因此 gameStart 技能會直接看到正確的初始類型。''',
)
append_once(
    'ONLINE_MULTIPLAYER.md',
    '### Initial work-type handshake',
    '''### Initial work-type handshake

Online protocol v3 adds a pre-game `workTypes` handshake after character draft animations settle. Host and Guest submit only their own roster's work-type mapping. Host creates and broadcasts the authoritative GameState only after both mappings are present and validated against each character's initial choices. This keeps work-type selection before all `gameStart` effects and avoids Host choosing Guest setup on their behalf.''',
)
append_once(
    'PROJECT_STATUS.md',
    '### 2026-09-19 P0 setup UI completion',
    '''### 2026-09-19 P0 setup UI completion

The P0 initial-work-type contract is now wired into user-facing setup: offline play inserts a work-type selection screen after leader choice, and online protocol v3 collects Host/Guest selections independently before the authoritative game is created. Legacy characters with no explicit affinity keep the existing `謀` fallback until their P2 character calibration lands.''',
)

print('P0 work-type selection UI/protocol patch applied successfully.')
