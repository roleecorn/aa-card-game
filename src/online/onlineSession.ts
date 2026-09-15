import { create } from 'zustand';
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
  type OnlineDraftState,
  type OnlineTeamSize,
} from './onlineDraft';
import { generateRoomCode, MqttSignalingClient, type SignalingMessage } from './mqttSignaling';

type OnlineRole = 'host' | 'guest';
type OnlineStatus = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'closed' | 'error';

interface OnlineSessionStore {
  role: OnlineRole | null;
  status: OnlineStatus;
  roomCode: string;
  teamSize: OnlineTeamSize | null;
  draft: OnlineDraftState | null;
  localTeamName: string;
  remoteTeamName: string | null;
  error: string | null;
  createHostRoom: (teamSize: OnlineTeamSize, teamName: string) => Promise<void>;
  joinGuestRoom: (roomCode: string, teamName: string) => Promise<void>;
  startHostDraft: (playableIds: string[]) => boolean;
  pickDraftCharacter: (characterId: string) => boolean;
  sendCommand: (command: OnlineCommand) => boolean;
  broadcastCurrentGame: () => boolean;
  disconnect: () => void;
  clearError: () => void;
}

let peer: RTCPeerConnection | null = null;
let channel: RTCDataChannel | null = null;
let signaling: MqttSignalingClient | null = null;
let remotePeerId: string | null = null;
let pendingRemoteCandidates: RTCIceCandidateInit[] = [];
let guestJoinTimer: ReturnType<typeof setInterval> | null = null;

const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

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

function broadcastDraft(draft: OnlineDraftState): boolean {
  return send({ version: ONLINE_PROTOCOL_VERSION, type: 'draft', draft });
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

  if (role === 'host' && message.type === 'draftPick') {
    const current = useOnlineSession.getState().draft;
    const next = current ? applyOnlineDraftPick(current, 'guest', message.characterId) : null;
    if (!next) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '目前不能選擇這張角色卡。' });
      return;
    }
    useOnlineSession.setState({
      draft: next,
      remoteTeamName: normalizeTeamName(message.teamName ?? DEFAULT_TEAM_NAME),
    });
    broadcastDraft(next);
    return;
  }

  if (role === 'guest' && message.type === 'draft') {
    useOnlineSession.setState({ draft: message.draft, teamSize: message.draft.teamSize, error: null });
    return;
  }

  if (role === 'host' && message.type === 'command') {
    const accepted = applyGuestCommand(message.command);
    if (!accepted) {
      send({ version: ONLINE_PROTOCOL_VERSION, type: 'error', message: '此操作在目前回合不可執行。' });
    }
    useOnlineSession.getState().broadcastCurrentGame();
    return;
  }

  if (role === 'guest' && message.type === 'snapshot') {
    useGameStore.getState().loadOnlineSnapshot(
      swapGamePerspective(message.game),
      restoreDefinition(message.definition),
    );
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
  localTeamName: DEFAULT_TEAM_NAME,
  remoteTeamName: null,
  error: null,

  createHostRoom: async (teamSize, requestedTeamName) => {
    closeTransport(false);
    const roomCode = generateRoomCode();
    const localTeamName = normalizeTeamName(requestedTeamName);
    set({ role: 'host', status: 'preparing', roomCode, teamSize, draft: null, localTeamName, remoteTeamName: null, error: null });
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
    const localTeamName = normalizeTeamName(requestedTeamName);
    set({ role: 'guest', status: 'preparing', roomCode, teamSize: null, draft: null, localTeamName, remoteTeamName: null, error: null });
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
      const draft = createOnlineDraft(state.teamSize, playableIds);
      set({ draft, error: null });
      broadcastDraft(draft);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
      return false;
    }
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
    const next = applyOnlineDraftPick(state.draft, 'host', characterId);
    if (!next) return false;
    set({ draft: next });
    broadcastDraft(next);
    return true;
  },

  sendCommand: (command) => send({ version: ONLINE_PROTOCOL_VERSION, type: 'command', command }),

  broadcastCurrentGame: () => {
    const { game, gameDefinition } = useGameStore.getState();
    if (!game) return false;
    return send({
      version: ONLINE_PROTOCOL_VERSION,
      type: 'snapshot',
      game,
      definition: snapshotDefinition(gameDefinition),
    });
  },

  disconnect: () => {
    closeTransport(true);
    set({ role: null, status: 'idle', roomCode: '', teamSize: null, draft: null, remoteTeamName: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
