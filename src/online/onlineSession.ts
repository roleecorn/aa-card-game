import { create } from 'zustand';
import { EngineSession, getInitialWorkTypeChoices } from '../game/engine';
import type { TeamId, WorkType } from '../game/schema';
import type { ActionChoice } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_TEAM_NAME, normalizeTeamName } from '../preferences/teamName';
import {
  ONLINE_PROTOCOL_VERSION,
  restoreDefinition,
  snapshotDefinition,
  swapGamePerspective,
  type OnlineCommand,
  type OnlineMessage,
} from './protocol';
import {
  applyOnlineDraftPick,
  createOnlineDraft,
  draftTurn,
  type OnlineDraftSide,
  type OnlineDraftState,
  type OnlineTeamSize,
} from './onlineDraft';
import {
  autoCompleteDraftBatch,
  createBattleRopeTimer,
  createDraftRopeTimer,
  localizeRemoteRopeTimer,
  type OnlineRopeTimer,
  type OnlineTimeoutNotice,
} from './onlineRope';
import { generateRoomCode, MqttSignalingClient, type SignalingMessage } from './mqttSignaling';

type OnlineRole = 'host' | 'guest';
type OnlineStatus = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'closed' | 'error';

export interface OnlineWorkTypeSelections {
  host: Record<string, WorkType> | null;
  guest: Record<string, WorkType> | null;
}

interface OnlineSessionStore {
  role: OnlineRole | null;
  status: OnlineStatus;
  roomCode: string;
  teamSize: OnlineTeamSize | null;
  draft: OnlineDraftState | null;
  workTypeSelections: OnlineWorkTypeSelections;
  localTeamName: string;
  remoteTeamName: string | null;
  timer: OnlineRopeTimer | null;
  timeoutNotice: OnlineTimeoutNotice | null;
  error: string | null;
  createHostRoom: (teamSize: OnlineTeamSize, teamName: string) => Promise<void>;
  joinGuestRoom: (roomCode: string, teamName: string) => Promise<void>;
  startHostDraft: (playableIds: string[]) => boolean;
  markDraftReady: () => void;
  pickDraftCharacter: (characterId: string) => boolean;
  submitWorkTypes: (selections: Record<string, WorkType>) => boolean;
  sendCommand: (command: OnlineCommand) => boolean;
  broadcastCurrentGame: () => boolean;
  disconnect: () => void;
  clearError: () => void;
  clearTimeoutNotice: () => void;
}

let peer: RTCPeerConnection | null = null;
let channel: RTCDataChannel | null = null;
let signaling: MqttSignalingClient | null = null;
let remotePeerId: string | null = null;
let pendingRemoteCandidates: RTCIceCandidateInit[] = [];
let guestJoinTimer: ReturnType<typeof setInterval> | null = null;
let hostRopeHandle: ReturnType<typeof setTimeout> | null = null;
let remotePlanChoices: Record<string, ActionChoice> = {};
let timeoutNoticeSequence = 0;
let draftReadyBySide: Record<OnlineDraftSide, boolean> = { host: false, guest: false };

const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function resetOnlineRuntime(): void {
  if (hostRopeHandle) clearTimeout(hostRopeHandle);
  hostRopeHandle = null;
  remotePlanChoices = {};
  timeoutNoticeSequence = 0;
  draftReadyBySide = { host: false, guest: false };
}

function stopGuestJoinRetry(): void {
  if (guestJoinTimer) clearInterval(guestJoinTimer);
  guestJoinTimer = null;
}

function closePeerTransport(): void {
  channel?.close();
  peer?.close();
  channel = null;
  peer = null;
  pendingRemoteCandidates = [];
}

function closeTransport(announce = false): void {
  stopGuestJoinRetry();
  if (announce && signaling && remotePeerId) publishSignal({ type: 'leave', to: remotePeerId });
  signaling?.close();
  signaling = null;
  closePeerTransport();
  remotePeerId = null;
}

function send(message: OnlineMessage): boolean {
  if (!channel || channel.readyState !== 'open') return false;
  channel.send(JSON.stringify(message));
  return true;
}

function publishSignal(
  payload: Pick<SignalingMessage, 'type'> & Partial<Omit<SignalingMessage, 'version' | 'roomCode' | 'from' | 'type'>>,
): boolean {
  const roomCode = useOnlineSession.getState().roomCode;
  if (!signaling || !roomCode) return false;
  return signaling.publish({
    version: 1,
    roomCode,
    from: signaling.peerId,
    ...payload,
  });
}

function setHostTimer(timer: OnlineRopeTimer | null): void {
  if (hostRopeHandle) clearTimeout(hostRopeHandle);
  hostRopeHandle = null;
  useOnlineSession.setState({ timer });
  if (!timer || useOnlineSession.getState().role !== 'host') return;
  hostRopeHandle = setTimeout(
    () => resolveHostTimeout(timer.id),
    Math.max(0, timer.deadlineAt - Date.now()),
  );
}

function maybeStartDraftTimer(draft: OnlineDraftState): OnlineRopeTimer | null {
  const turn = draftTurn(draft);
  if (!turn) {
    setHostTimer(null);
    return null;
  }

  const current = useOnlineSession.getState().timer;
  const expectedId = `draft:${draft.batchIndex}`;
  if (current?.kind === 'draft' && current.id === expectedId) return current;

  if (!draftReadyBySide[turn.side]) {
    setHostTimer(null);
    return null;
  }

  const timer = createDraftRopeTimer(draft);
  setHostTimer(timer);
  return timer;
}

function syncBattleTimer(): OnlineRopeTimer | null {
  const game = useGameStore.getState().game;
  if (!game || game.phase === 'finished') {
    setHostTimer(null);
    return null;
  }

  const current = useOnlineSession.getState().timer;
  const candidate = createBattleRopeTimer(game);
  if (!candidate) {
    setHostTimer(null);
    return null;
  }
  if (current?.kind === 'battle' && current.id === candidate.id) return current;

  if (candidate.phase === 'enemy-plan') remotePlanChoices = {};
  setHostTimer(candidate);
  return candidate;
}

function broadcastDraft(draft: OnlineDraftState): boolean {
  const state = useOnlineSession.getState();
  return send({
    version: ONLINE_PROTOCOL_VERSION,
    type: 'draft',
    draft,
    timer: state.timer,
    hostNow: Date.now(),
    hostTeamName: state.localTeamName,
    guestTeamName: state.remoteTeamName ?? undefined,
  });
}

function normalizeWorkTypeSelections(
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

function publishTimeoutNotice(title: string, message: string): void {
  const notice: OnlineTimeoutNotice = {
    id: `${Date.now()}-${timeoutNoticeSequence += 1}`,
    title,
    message,
    createdAt: Date.now(),
  };
  useOnlineSession.setState({ timeoutNotice: notice });
  send({ version: ONLINE_PROTOCOL_VERSION, type: 'timeout', notice });
}

function updateHostDraft(previous: OnlineDraftState, next: OnlineDraftState): void {
  useOnlineSession.setState({ draft: next });
  if (next.status === 'complete') {
    setHostTimer(null);
  } else if (next.batchIndex !== previous.batchIndex) {
    maybeStartDraftTimer(next);
  }
  broadcastDraft(next);
}

function normalizeActionsForTeam(
  teamId: TeamId,
  requested: Record<string, ActionChoice>,
): Record<string, ActionChoice> {
  const { game, gameDefinition } = useGameStore.getState();
  if (!game) return {};
  const engine = new EngineSession(game, Math.random, gameDefinition);
  const team = teamId === 'player' ? game.player : game.enemy;
  return Object.fromEntries(team.members.map((member) => [
    member.defId,
    engine.isAtStressCap(teamId, member.defId) ? 'slack' : requested[member.defId] ?? 'work',
  ])) as Record<string, ActionChoice>;
}

function discardOverflowAtRandom(teamId: TeamId): void {
  const store = useGameStore.getState();
  const game = store.game;
  if (!game) return;
  const team = teamId === 'player' ? game.player : game.enemy;
  const excess = team.hand.length - store.gameDefinition.rules.handLimit;
  if (excess <= 0) return;

  const shuffled = [...team.hand];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  store.discardCards(teamId, shuffled.slice(0, excess).map((card) => card.instanceId));
}

function resolveDraftTimeout(timer: OnlineRopeTimer): boolean {
  const state = useOnlineSession.getState();
  const current = state.draft;
  if (!current || current.status !== 'drafting') return false;
  if (timer.id !== `draft:${current.batchIndex}`) return false;
  const turn = draftTurn(current);
  if (!turn || timer.side !== turn.side) return false;

  const { draft: next, pickedIds } = autoCompleteDraftBatch(current);
  if (!pickedIds.length) return false;
  const actorName = timer.side === 'host'
    ? state.localTeamName
    : state.remoteTeamName ?? '對手隊伍';
  publishTimeoutNotice('選角逾時', `${actorName} 已自動選擇剩餘角色。`);
  updateHostDraft(current, next);
  return true;
}

function resolveBattleTimeout(timer: OnlineRopeTimer): boolean {
  const store = useGameStore.getState();
  const game = store.game;
  if (!game || game.phase === 'finished' || timer.phase !== game.phase) return false;

  const teamId: TeamId = timer.side === 'host' ? 'player' : 'enemy';
  const expectedSide = game.phase.startsWith('player-') ? 'host' : 'guest';
  if (expectedSide !== timer.side) return false;

  discardOverflowAtRandom(teamId);
  const refreshed = useGameStore.getState();
  const currentGame = refreshed.game;
  if (!currentGame || currentGame.phase !== timer.phase) return false;
  const teamName = teamId === 'player' ? currentGame.player.name : currentGame.enemy.name;

  let advanced = false;
  if (currentGame.phase.endsWith('-plan')) {
    const requested = teamId === 'player' ? refreshed.actionChoices : remotePlanChoices;
    advanced = refreshed.performOnlineActions(teamId, normalizeActionsForTeam(teamId, requested));
  } else {
    advanced = refreshed.finishOnlineAssignment(teamId);
  }
  if (!advanced) return false;

  publishTimeoutNotice(
    '操作逾時',
    timer.phase?.endsWith('-plan')
      ? `${teamName} 已自動結束規劃並進入骰子配置階段。`
      : `${teamName} 已自動結束目前階段。`,
  );
  useOnlineSession.getState().broadcastCurrentGame();
  return true;
}

function resolveHostTimeout(expectedTimerId: string): boolean {
  hostRopeHandle = null;
  const state = useOnlineSession.getState();
  const timer = state.timer;
  if (state.role !== 'host' || !timer || timer.id !== expectedTimerId) return false;
  const remaining = timer.deadlineAt - Date.now();
  if (remaining > 0) {
    hostRopeHandle = setTimeout(() => resolveHostTimeout(timer.id), remaining);
    return false;
  }
  return timer.kind === 'draft' ? resolveDraftTimeout(timer) : resolveBattleTimeout(timer);
}

function resolveExpiredHostTimer(): boolean {
  const timer = useOnlineSession.getState().timer;
  if (!timer || timer.deadlineAt > Date.now()) return false;
  return resolveHostTimeout(timer.id);
}

function canGuestUseTurnAction(): boolean {
  const phase = useGameStore.getState().game?.phase;
  return phase === 'enemy-plan' || phase === 'enemy-assign';
}

function applyGuestCommand(command: OnlineCommand): boolean {
  const store = useGameStore.getState();
  const phase = store.game?.phase;
  if (!store.game || phase === 'finished') return false;

  switch (command.type) {
    case 'performActions':
      return phase === 'enemy-plan' && store.performOnlineActions('enemy', command.actions);
    case 'placeDie':
      return phase === 'enemy-assign' && store.placeOnlineDie('enemy', command.dieId, command.workId, command.slotIndex);
    case 'finishAssignment':
      return phase === 'enemy-assign' && store.finishOnlineAssignment('enemy');
    case 'playCard':
      return canGuestUseTurnAction() && store.playCard('enemy', command.instanceId, command.target ?? {});
    case 'activateSkill':
      return canGuestUseTurnAction() && store.activateSkill('enemy', command.memberId, command.skillId, command.target ?? {});
    case 'discardCards':
      return store.discardCards('enemy', command.instanceIds);
  }
}

function handleGameMessage(raw: string, role: OnlineRole): void {
  let message: OnlineMessage;
  try {
    message = JSON.parse(raw) as OnlineMessage;
  } catch {
    useOnlineSession.setState({ error: '收到異常的連線資料，請重新加入房間。' });
    return;
  }

  if (message.version !== ONLINE_PROTOCOL_VERSION) {
    useOnlineSession.setState({ error: '雙方遊戲版本不同，請確認使用相同版本後重新連線。' });
    return;
  }

  if (role === 'host' && message.type === 'draftReady') {
    draftReadyBySide.guest = true;
    useOnlineSession.setState({ remoteTeamName: normalizeTeamName(message.teamName) });
    const current = useOnlineSession.getState().draft;
    if (current) {
      maybeStartDraftTimer(current);
      broadcastDraft(current);
    }
    return;
  }

  if (role === 'host' && message.type === 'draftPick') {
    if (resolveExpiredHostTimer()) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '選角時間已結束。' });
      return;
    }
    const current = useOnlineSession.getState().draft;
    const next = current ? applyOnlineDraftPick(current, 'guest', message.characterId) : null;
    if (!current || !next) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '目前不能選擇這張角色卡。' });
      return;
    }
    useOnlineSession.setState({ remoteTeamName: normalizeTeamName(message.teamName ?? DEFAULT_TEAM_NAME) });
    updateHostDraft(current, next);
    return;
  }

  if (role === 'host' && message.type === 'workTypes') {
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

  if (role === 'guest' && message.type === 'draft') {
    useOnlineSession.setState({
      draft: message.draft,
      teamSize: message.draft.teamSize,
      timer: localizeRemoteRopeTimer(message.timer, message.hostNow),
      remoteTeamName: normalizeTeamName(message.hostTeamName),
      error: null,
    });
    return;
  }

  if (role === 'host' && message.type === 'planPreview') {
    if (resolveExpiredHostTimer()) return;
    if (useGameStore.getState().game?.phase === 'enemy-plan') remotePlanChoices = message.actions;
    return;
  }

  if (role === 'host' && message.type === 'command') {
    if (resolveExpiredHostTimer()) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '操作時間已結束。' });
      return;
    }
    const accepted = applyGuestCommand(message.command);
    if (!accepted) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '此操作在目前回合不可執行。' });
    }
    useOnlineSession.getState().broadcastCurrentGame();
    return;
  }

  if (role === 'guest' && message.type === 'snapshot') {
    useOnlineSession.setState({ timer: localizeRemoteRopeTimer(message.timer, message.hostNow) });
    useGameStore.getState().loadOnlineSnapshot(
      swapGamePerspective(message.game),
      restoreDefinition(message.definition),
    );
    return;
  }

  if (role === 'guest' && message.type === 'timeout') {
    useOnlineSession.setState({ timeoutNotice: message.notice });
    return;
  }

  if (message.type === 'error') useOnlineSession.setState({ error: message.message });
}

function attachChannel(nextChannel: RTCDataChannel, role: OnlineRole): void {
  channel = nextChannel;
  channel.onopen = () => {
    stopGuestJoinRetry();
    signaling?.close();
    signaling = null;
    useOnlineSession.setState({ status: 'connected', error: null });
    if (role === 'host') {
      const game = useGameStore.getState().game;
      if (game) useOnlineSession.getState().broadcastCurrentGame();
    }
  };
  channel.onclose = () => useOnlineSession.setState({ status: 'closed' });
  channel.onerror = () => useOnlineSession.setState({ status: 'error', error: '連線發生錯誤，請重新建立或加入房間。' });
  channel.onmessage = (event) => handleGameMessage(String(event.data), role);
}

function createPeer(role: OnlineRole): RTCPeerConnection {
  const connection = new RTCPeerConnection(rtcConfiguration);
  peer = connection;

  connection.onicecandidate = (event) => {
    if (!event.candidate || !remotePeerId) return;
    publishSignal({ type: 'ice', to: remotePeerId, candidate: event.candidate.toJSON() });
  };
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === 'failed') {
      useOnlineSession.setState({ status: 'error', error: '無法與對手建立連線，請確認網路狀況後重試。' });
    }
  };

  if (role === 'host') {
    attachChannel(connection.createDataChannel('aa-card-game', { ordered: true }), 'host');
  } else {
    connection.ondatachannel = (event) => attachChannel(event.channel, 'guest');
  }
  return connection;
}

async function flushRemoteCandidates(): Promise<void> {
  if (!peer?.remoteDescription) return;
  const candidates = pendingRemoteCandidates;
  pendingRemoteCandidates = [];
  for (const candidate of candidates) await peer.addIceCandidate(candidate);
}

async function applyRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!peer?.remoteDescription) {
    pendingRemoteCandidates.push(candidate);
    return;
  }
  await peer.addIceCandidate(candidate);
}

async function handleHostSignal(message: SignalingMessage): Promise<void> {
  if (!signaling || message.from === signaling.peerId) return;
  if (message.to && message.to !== signaling.peerId) return;

  if (message.type === 'join') {
    if (remotePeerId && remotePeerId !== message.from) {
      publishSignal({ type: 'busy', to: message.from });
      return;
    }
    remotePeerId = message.from;
    useOnlineSession.setState({ status: 'connecting', error: null });

    if (peer?.localDescription?.type === 'offer') {
      publishSignal({ type: 'offer', to: remotePeerId, description: peer.localDescription.toJSON() });
      return;
    }
    if (peer) return;

    const connection = createPeer('host');
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    if (!connection.localDescription) throw new Error('建立連線失敗，請重試。');
    publishSignal({ type: 'offer', to: remotePeerId, description: connection.localDescription.toJSON() });
    return;
  }

  if (!remotePeerId || message.from !== remotePeerId) return;
  if (message.type === 'answer' && message.description && peer) {
    await peer.setRemoteDescription(message.description);
    await flushRemoteCandidates();
    return;
  }
  if (message.type === 'ice' && message.candidate) {
    await applyRemoteCandidate(message.candidate);
    return;
  }
  if (message.type === 'leave') {
    closeTransport(false);
    useOnlineSession.setState({ status: 'closed', error: '對手已離開房間。' });
  }
}

async function handleGuestSignal(message: SignalingMessage): Promise<void> {
  if (!signaling || message.from === signaling.peerId) return;
  if (message.to && message.to !== signaling.peerId) return;

  if (message.type === 'busy') {
    closeTransport(false);
    useOnlineSession.setState({ status: 'error', error: '此房間已有其他玩家。' });
    return;
  }

  if (message.type === 'offer' && message.description) {
    if (remotePeerId && remotePeerId !== message.from) return;
    remotePeerId = message.from;
    stopGuestJoinRetry();
    useOnlineSession.setState({ status: 'connecting', error: null });

    const connection = peer ?? createPeer('guest');
    await connection.setRemoteDescription(message.description);
    await flushRemoteCandidates();
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    if (!connection.localDescription) throw new Error('加入房間失敗，請重試。');
    publishSignal({ type: 'answer', to: remotePeerId, description: connection.localDescription.toJSON() });
    return;
  }

  if (remotePeerId && message.from !== remotePeerId) return;
  if (message.type === 'ice' && message.candidate) {
    await applyRemoteCandidate(message.candidate);
    return;
  }
  if (message.type === 'leave') {
    closeTransport(false);
    useOnlineSession.setState({ status: 'closed', error: '房主已離開房間。' });
  }
}

function reportSignalingError(message: string): void {
  if (useOnlineSession.getState().status === 'connected') return;
  useOnlineSession.setState({ status: 'error', error: message });
}

export const useOnlineSession = create<OnlineSessionStore>((set, get) => ({
  role: null,
  status: 'idle',
  roomCode: '',
  teamSize: null,
  draft: null,
  workTypeSelections: { host: null, guest: null },
  localTeamName: DEFAULT_TEAM_NAME,
  remoteTeamName: null,
  timer: null,
  timeoutNotice: null,
  error: null,

  createHostRoom: async (teamSize, requestedTeamName) => {
    closeTransport(false);
    resetOnlineRuntime();
    const roomCode = generateRoomCode();
    const localTeamName = normalizeTeamName(requestedTeamName);
    set({
      role: 'host',
      status: 'preparing',
      roomCode,
      teamSize,
      draft: null,
      workTypeSelections: { host: null, guest: null },
      localTeamName,
      remoteTeamName: null,
      timer: null,
      timeoutNotice: null,
      error: null,
    });
    try {
      signaling = new MqttSignalingClient({
        roomCode,
        onMessage: (message) => void handleHostSignal(message).catch((error) => reportSignalingError(error instanceof Error ? error.message : String(error))),
        onError: reportSignalingError,
      });
      await signaling.connect();
      set({ status: 'waiting', error: null });
    } catch (error) {
      closeTransport(false);
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  },

  joinGuestRoom: async (input, requestedTeamName) => {
    const roomCode = input.trim();
    if (!/^\d{6}$/.test(roomCode)) {
      set({ status: 'error', error: '房間代碼必須是 6 位數字。' });
      return;
    }

    closeTransport(false);
    resetOnlineRuntime();
    const localTeamName = normalizeTeamName(requestedTeamName);
    set({
      role: 'guest',
      status: 'preparing',
      roomCode,
      teamSize: null,
      draft: null,
      workTypeSelections: { host: null, guest: null },
      localTeamName,
      remoteTeamName: null,
      timer: null,
      timeoutNotice: null,
      error: null,
    });
    try {
      signaling = new MqttSignalingClient({
        roomCode,
        onMessage: (message) => void handleGuestSignal(message).catch((error) => reportSignalingError(error instanceof Error ? error.message : String(error))),
        onError: reportSignalingError,
      });
      await signaling.connect();
      set({ status: 'waiting', error: null });

      const announce = () => publishSignal({ type: 'join' });
      announce();
      guestJoinTimer = setInterval(announce, 2_000);
    } catch (error) {
      closeTransport(false);
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  },

  startHostDraft: (playableIds) => {
    const state = get();
    if (state.role !== 'host' || state.status !== 'connected' || !state.teamSize) return false;
    if (state.draft) return true;
    try {
      draftReadyBySide = { host: false, guest: false };
      const draft = createOnlineDraft(state.teamSize, playableIds);
      set({ draft, workTypeSelections: { host: null, guest: null }, timer: null, error: null });
      broadcastDraft(draft);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  },

  markDraftReady: () => {
    const state = get();
    if (!state.draft || !state.role) return;
    if (draftReadyBySide[state.role]) return;
    draftReadyBySide[state.role] = true;
    if (state.role === 'guest') {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'draftReady', teamName: state.localTeamName });
      return;
    }
    maybeStartDraftTimer(state.draft);
    broadcastDraft(state.draft);
  },

  pickDraftCharacter: (characterId) => {
    const state = get();
    if (!state.draft || state.status !== 'connected' || !state.role) return false;
    if (state.role === 'guest') {
      return send({
        version: ONLINE_PROTOCOL_VERSION,
        type: 'draftPick',
        characterId,
        teamName: state.localTeamName,
      });
    }
    if (resolveExpiredHostTimer()) return false;
    const next = applyOnlineDraftPick(state.draft, 'host', characterId);
    if (!next) return false;
    updateHostDraft(state.draft, next);
    return true;
  },

  submitWorkTypes: (selections) => {
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

  sendCommand: (command) => send({ version: ONLINE_PROTOCOL_VERSION, type: 'command', command }),

  broadcastCurrentGame: () => {
    const state = get();
    if (state.role !== 'host') return false;
    const { game, gameDefinition } = useGameStore.getState();
    if (!game) return false;
    const timer = syncBattleTimer();
    return send({
      version: ONLINE_PROTOCOL_VERSION,
      type: 'snapshot',
      game,
      definition: snapshotDefinition(gameDefinition),
      timer,
      hostNow: Date.now(),
    });
  },

  disconnect: () => {
    closeTransport(true);
    resetOnlineRuntime();
    set({
      role: null,
      status: 'idle',
      roomCode: '',
      teamSize: null,
      draft: null,
      workTypeSelections: { host: null, guest: null },
      remoteTeamName: null,
      timer: null,
      timeoutNotice: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
  clearTimeoutNotice: () => set({ timeoutNotice: null }),
}));

useGameStore.subscribe((state, previous) => {
  if (state.actionChoices === previous.actionChoices) return;
  const online = useOnlineSession.getState();
  if (online.role !== 'guest' || online.status !== 'connected' || state.game?.phase !== 'player-plan') return;
  send({
    version: ONLINE_PROTOCOL_VERSION,
    type: 'planPreview',
    actions: state.actionChoices,
  });
});
