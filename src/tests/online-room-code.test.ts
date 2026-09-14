import { describe, expect, it } from 'vitest';
import dialogSource from '../components/OnlineConnectionDialog.tsx?raw';
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
});
