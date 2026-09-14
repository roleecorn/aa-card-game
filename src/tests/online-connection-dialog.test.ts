import { describe, expect, it } from 'vitest';
import dialogSource from '../components/OnlineConnectionDialog.tsx?raw';

describe('online connection dialog exit behavior', () => {
  it('disconnects whenever the user leaves the online setup dialog', () => {
    expect(dialogSource).toContain('const leaveOnlineSetup = () => {');
    expect(dialogSource).toContain('disconnect();');
    expect(dialogSource).toContain('onClose();');
    expect(dialogSource).toContain('onClose={leaveOnlineSetup}');
    expect(dialogSource).toContain('<Button onClick={leaveOnlineSetup}>關閉</Button>');
  });

  it('does not require a separate disconnect button', () => {
    expect(dialogSource).not.toContain('>中斷連線</Button>');
    expect(dialogSource).not.toContain("color=\"warning\" onClick={disconnect}");
  });
});
