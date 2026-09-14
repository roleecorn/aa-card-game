const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'aa-card-game/online-v1/';
const KEEP_ALIVE_SECONDS = 30;

type Bytes = Uint8Array<ArrayBufferLike>;
type OwnedBytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function concatBytes(...parts: Bytes[]): OwnedBytes {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function encodeRemainingLength(value: number): OwnedBytes {
  const bytes: number[] = [];
  let remaining = value;
  do {
    let digit = remaining % 128;
    remaining = Math.floor(remaining / 128);
    if (remaining > 0) digit |= 0x80;
    bytes.push(digit);
  } while (remaining > 0);
  return Uint8Array.from(bytes);
}

function encodeMqttString(value: string): OwnedBytes {
  const bytes = encoder.encode(value);
  if (bytes.length > 0xffff) throw new Error('MQTT string is too long.');
  return concatBytes(Uint8Array.of(bytes.length >> 8, bytes.length & 0xff), bytes);
}

function mqttPacket(header: number, body: Bytes = new Uint8Array()): OwnedBytes {
  return concatBytes(Uint8Array.of(header), encodeRemainingLength(body.length), body);
}

function randomPeerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Six decimal digits are intentionally a convenience room locator, not a password. */
export function generateRoomCode(): string {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return String(values[0]! % 1_000_000).padStart(6, '0');
}

export interface SignalingMessage {
  version: 1;
  roomCode: string;
  from: string;
  to?: string;
  type: 'join' | 'offer' | 'answer' | 'ice' | 'busy' | 'leave';
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface SignalClientOptions {
  roomCode: string;
  onMessage: (message: SignalingMessage) => void;
  onError: (message: string) => void;
}

/**
 * Minimal MQTT 3.1.1 client used only as a WebRTC rendezvous channel.
 * It deliberately supports only CONNECT, SUBSCRIBE, QoS-0 PUBLISH, PING and DISCONNECT.
 */
export class MqttSignalingClient {
  readonly peerId = randomPeerId();
  private readonly topic: string;
  private socket: WebSocket | null = null;
  private buffer: Bytes = new Uint8Array();
  private packetId = 1;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  constructor(private readonly options: SignalClientOptions) {
    this.topic = `${TOPIC_PREFIX}${options.roomCode}`;
  }

  connect(): Promise<void> {
    if (this.socket) return Promise.reject(new Error('Signaling client is already connected.'));
    this.intentionalClose = false;

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      this.connectTimeout = setTimeout(() => this.failConnect('連線 signaling broker 逾時。'), 10_000);

      const socket = new WebSocket(BROKER_URL, 'mqtt');
      socket.binaryType = 'arraybuffer';
      this.socket = socket;

      socket.onopen = () => this.sendConnect();
      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.consume(new Uint8Array(event.data));
        } else if (event.data instanceof Blob) {
          void event.data.arrayBuffer().then((buffer) => this.consume(new Uint8Array(buffer)));
        }
      };
      socket.onerror = () => this.failConnect('無法連線到公開 signaling broker。');
      socket.onclose = () => {
        this.stopKeepAlive();
        if (!this.intentionalClose) {
          this.failConnect('Signaling broker 連線已中斷。');
          this.options.onError('Signaling broker 連線已中斷。');
        }
      };
    });
  }

  publish(message: SignalingMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    const body = concatBytes(encodeMqttString(this.topic), encoder.encode(JSON.stringify(message)));
    this.socket.send(mqttPacket(0x30, body));
    return true;
  }

  close(): void {
    this.intentionalClose = true;
    this.stopKeepAlive();
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(Uint8Array.of(0xe0, 0x00));
    this.socket?.close();
    this.socket = null;
    this.clearConnectWaiters();
    this.buffer = new Uint8Array();
  }

  private sendConnect(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const variableHeader = concatBytes(
      encodeMqttString('MQTT'),
      Uint8Array.of(0x04, 0x02, KEEP_ALIVE_SECONDS >> 8, KEEP_ALIVE_SECONDS & 0xff),
    );
    const payload = encodeMqttString(`aa-card-game-${this.peerId}`);
    this.socket.send(mqttPacket(0x10, concatBytes(variableHeader, payload)));
  }

  private sendSubscribe(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const id = this.nextPacketId();
    const body = concatBytes(
      Uint8Array.of(id >> 8, id & 0xff),
      encodeMqttString(this.topic),
      Uint8Array.of(0x00),
    );
    this.socket.send(mqttPacket(0x82, body));
  }

  private consume(chunk: Bytes): void {
    this.buffer = concatBytes(this.buffer, chunk);

    while (this.buffer.length >= 2) {
      let multiplier = 1;
      let remainingLength = 0;
      let index = 1;
      let digit = 0;
      do {
        if (index >= this.buffer.length) return;
        digit = this.buffer[index++]!;
        remainingLength += (digit & 0x7f) * multiplier;
        multiplier *= 128;
        if (multiplier > 128 ** 4) {
          this.options.onError('收到無效的 MQTT packet。');
          this.close();
          return;
        }
      } while ((digit & 0x80) !== 0);

      const packetEnd = index + remainingLength;
      if (this.buffer.length < packetEnd) return;
      const header = this.buffer[0]!;
      const body = this.buffer.slice(index, packetEnd);
      this.buffer = this.buffer.slice(packetEnd);
      this.handlePacket(header, body);
    }
  }

  private handlePacket(header: number, body: Bytes): void {
    const type = header >> 4;
    if (type === 2) {
      if (body.length < 2 || body[1] !== 0) {
        this.failConnect(`MQTT broker 拒絕連線（code ${body[1] ?? 'unknown'}）。`);
        return;
      }
      this.sendSubscribe();
      return;
    }

    if (type === 9) {
      if (body.length < 3 || body[2] === 0x80) {
        this.failConnect('MQTT broker 拒絕訂閱房間。');
        return;
      }
      this.finishConnect();
      return;
    }

    if (type !== 3 || body.length < 2) return;
    const topicLength = (body[0]! << 8) | body[1]!;
    if (body.length < 2 + topicLength) return;
    const topic = decoder.decode(body.slice(2, 2 + topicLength));
    if (topic !== this.topic) return;

    let payloadOffset = 2 + topicLength;
    const qos = (header >> 1) & 0x03;
    if (qos > 0) payloadOffset += 2;
    if (payloadOffset > body.length) return;

    try {
      const message = JSON.parse(decoder.decode(body.slice(payloadOffset))) as SignalingMessage;
      if (message.version !== 1 || message.roomCode !== this.options.roomCode || !message.from || !message.type) return;
      this.options.onMessage(message);
    } catch {
      // Public topics can receive unrelated/malformed payloads. Ignore them.
    }
  }

  private finishConnect(): void {
    const resolve = this.connectResolve;
    this.clearConnectWaiters();
    this.keepAliveTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(Uint8Array.of(0xc0, 0x00));
    }, 15_000);
    resolve?.();
  }

  private failConnect(message: string): void {
    const reject = this.connectReject;
    this.clearConnectWaiters();
    reject?.(new Error(message));
  }

  private clearConnectWaiters(): void {
    if (this.connectTimeout) clearTimeout(this.connectTimeout);
    this.connectTimeout = null;
    this.connectResolve = null;
    this.connectReject = null;
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = null;
  }

  private nextPacketId(): number {
    const id = this.packetId;
    this.packetId = this.packetId >= 0xffff ? 1 : this.packetId + 1;
    return id;
  }
}
