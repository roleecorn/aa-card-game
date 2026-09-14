import { create } from 'zustand';
import { useGameStore } from '../store/gameStore';
import {
  ONLINE_PROTOCOL_VERSION,
  decodeSignal,
  encodeSignal,
  restoreDefinition,
  snapshotDefinition,
  swapGamePerspective,
  type OnlineCommand,
  type OnlineMessage,
} from './protocol';

type OnlineRole = 'host' | 'guest';
type OnlineStatus = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'closed' | 'error';

interface OnlineSessionStore {
  role: OnlineRole | null;
  status: OnlineStatus;
  offerCode: string;
  answerCode: string;
  error: string | null;
  createHostOffer: () => Promise<void>;
  createGuestAnswer: (offerCode: string) => Promise<void>;
  acceptHostAnswer: (answerCode: string) => Promise<void>;
  sendCommand: (command: OnlineCommand) => boolean;
  broadcastCurrentGame: () => boolean;
  disconnect: () => void;
  clearError: () => void;
}

let peer: RTCPeerConnection | null = null;
let channel: RTCDataChannel | null = null;

const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function closeTransport(): void {
  channel?.close();
  peer?.close();
  channel = null;
  peer = null;
}

function waitForIceGatheringComplete(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      connection.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timeout);
      resolve();
    };
    const onChange = () => {
      if (connection.iceGatheringState === 'complete') finish();
    };
    const timeout = setTimeout(finish, 8000);
    connection.addEventListener('icegatheringstatechange', onChange);
  });
}

function send(message: OnlineMessage): boolean {
  if (!channel || channel.readyState !== 'open') return false;
  channel.send(JSON.stringify(message));
  return true;
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

function handleMessage(raw: string, role: OnlineRole): void {
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
    useOnlineSession.setState({ status: 'connected', error: null });
    if (role === 'host') useOnlineSession.getState().broadcastCurrentGame();
  };
  channel.onclose = () => useOnlineSession.setState({ status: 'closed' });
  channel.onerror = () => useOnlineSession.setState({ status: 'error', error: 'WebRTC DataChannel 發生錯誤。' });
  channel.onmessage = (event) => handleMessage(String(event.data), role);
}

export const useOnlineSession = create<OnlineSessionStore>((set, get) => ({
  role: null,
  status: 'idle',
  offerCode: '',
  answerCode: '',
  error: null,

  createHostOffer: async () => {
    closeTransport();
    set({ role: 'host', status: 'preparing', offerCode: '', answerCode: '', error: null });
    try {
      peer = new RTCPeerConnection(rtcConfiguration);
      attachChannel(peer.createDataChannel('aa-card-game', { ordered: true }), 'host');
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGatheringComplete(peer);
      if (!peer.localDescription) throw new Error('Missing local offer.');
      set({ offerCode: encodeSignal(peer.localDescription), status: 'waiting' });
    } catch (error) {
      closeTransport();
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  },

  createGuestAnswer: async (offerCode) => {
    closeTransport();
    set({ role: 'guest', status: 'preparing', offerCode, answerCode: '', error: null });
    try {
      peer = new RTCPeerConnection(rtcConfiguration);
      peer.ondatachannel = (event) => attachChannel(event.channel, 'guest');
      await peer.setRemoteDescription(decodeSignal(offerCode));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitForIceGatheringComplete(peer);
      if (!peer.localDescription) throw new Error('Missing local answer.');
      set({ answerCode: encodeSignal(peer.localDescription), status: 'connecting' });
    } catch (error) {
      closeTransport();
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  },

  acceptHostAnswer: async (answerCode) => {
    if (!peer || get().role !== 'host') {
      set({ status: 'error', error: '請先建立 Host Offer。' });
      return;
    }
    try {
      set({ status: 'connecting', error: null });
      await peer.setRemoteDescription(decodeSignal(answerCode));
    } catch (error) {
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
    closeTransport();
    set({ role: null, status: 'idle', offerCode: '', answerCode: '', error: null });
  },

  clearError: () => set({ error: null }),
}));
