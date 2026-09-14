import { describe, expect, it } from 'vitest';
import dialogSource from '../components/OnlineConnectionDialog.tsx?raw';
import draftSource from '../components/OnlineDraftScreen.tsx?raw';
import sessionSource from '../online/onlineSession.ts?raw';
import signalingSource from '../online/mqttSignaling.ts?raw';
import { generateRoomCode } from '../online/mqttSignaling';

describe('online room code pairing', () => {
  it('generates six decimal digits', () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateRoomCode()).toMatch(/^\d{6}$/);
    }
  });

  it('uses a six-digit room-code UI instead of manual SDP exchange', () => {
    expect(dialogSource).toContain('6 位數房間代碼');
    expect(dialogSource).toContain('加入房間');
    expect(dialogSource).not.toContain('Offer Code');
    expect(dialogSource).not.toContain('Answer Code');
    expect(dialogSource).not.toContain('remoteOffer');
    expect(dialogSource).not.toContain('remoteAnswer');
  });

  it('keeps network implementation details out of player-facing copy', () => {
    for (const term of ['WebRTC', 'P2P', 'signaling', 'SDP', 'ICE', 'TURN', 'MQTT', 'broker']) {
      expect(dialogSource).not.toContain(term);
    }
    expect(draftSource).not.toContain('角色 Draft');
    expect(draftSource).not.toContain('我的 Pick');
    expect(draftSource).not.toContain('對手 Pick');
    expect(sessionSource).not.toContain('WebRTC DataChannel 發生錯誤');
    expect(sessionSource).not.toContain('WebRTC P2P 連線失敗');
    expect(sessionSource).not.toContain('TURN relay');
    expect(signalingSource).not.toContain('signaling broker 逾時');
    expect(signalingSource).not.toContain('MQTT broker 拒絕');
  });
});
