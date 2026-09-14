import { create } from 'zustand';
import { useGameStore } from '../store/gameStore';
import {
  ONLINE_PROTOCOL_VERSION,
  restoreDefinition,
  snapshotDefinition,
  swapGamePerspective,
  type OnlineCommand,
  type OnlineMessage,
} from './protocol';
import { generateRoomCode, MqttSignalingClient, type SignalingMessage } from './mqttSignaling';

type OnlineRole = 'host' | 'guest';
type OnlineStatus = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'closed' | 'error';

interface OnlineSessionStore {
  role: OnlineRole | null;
  status: OnlineStatus;
  roomCode: string;
  error: string | null;
  createHostRoom: () => Promise<void>;
  joinGuestRoom: (roomCode: string) => Promise<void>;
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
    useOnlineSession.setState({ error: '收到無法解析的連線資料。' });
    return;
  }

  if (message.version !== ONLINE_PROTOCOL_VERSION) {
    useOnlineSession.setState({ error: '雙方遊戲版本的連線協定不相容。' });
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
    if (role === 'host') useOnlineSession.getState().broadcastCurrentGame();
  };
  channel.onclose = () => useOnlineSession.setState({ status: 'closed' });
  channel.onerror = () => useOnlineSession.setState({ status: 'error', error: 'WebRTC DataChannel 發生錯誤。' });
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
      useOnlineSession.setState({ status: 'error', error: 'WebRTC P2P 連線失敗；目前網路環境可能需要 TURN relay。' });
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
    if (!connection.localDescription) throw new Error('Missing local WebRTC offer.');
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
    useOnlineSession.setState({ status: 'closed', error: 'Guest 已離開房間。' });
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
    if (!connection.localDescription) throw new Error('Missing local WebRTC answer.');
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
    useOnlineSession.setState({ status: 'closed', error: 'Host 已離開房間。' });
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
  error: null,

  createHostRoom: async () => {
    closeTransport(false);
    const roomCode = generateRoomCode();
    set({ role: 'host', status: 'preparing', roomCode, error: null });
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

  joinGuestRoom: async (input) => {
    const roomCode = input.trim();
    if (!/^\d{6}$/.test(roomCode)) {
      set({ status: 'error', error: '房間代碼必須是 6 位數字。' });
      return;
    }

    closeTransport(false);
    set({ role: 'guest', status: 'preparing', roomCode, error: null });
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
    set({ role: null, status: 'idle', roomCode: '', error: null });
  },

  clearError: () => set({ error: null }),
}));
