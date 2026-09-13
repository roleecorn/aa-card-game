import { describe, expect, it } from 'vitest';
import logPanelSource from '../components/LogPanel.tsx?raw';

describe('game log panel UI', () => {
  it('opens a large modal dialog from the fixed Log button', () => {
    expect(logPanelSource).toContain("position: 'fixed'");
    expect(logPanelSource).toContain('<Dialog');
    expect(logPanelSource).toContain('maxWidth="lg"');
    expect(logPanelSource).toContain("height: { xs: '86vh', md: '78vh' }");
    expect(logPanelSource).toContain('aria-haspopup="dialog"');
    expect(logPanelSource).toContain('aria-controls="game-log-dialog"');
  });

  it('supports closing by the X button, Escape, or backdrop click', () => {
    expect(logPanelSource).toContain('onClose={closeDialog}');
    expect(logPanelSource).toContain('aria-label="關閉遊戲紀錄"');
    expect(logPanelSource).toContain('onClick={closeDialog}');
    expect(logPanelSource).not.toContain("reason === 'backdropClick'");
  });

  it('renders logs oldest-to-newest and opens scrolled to the newest entry', () => {
    expect(logPanelSource).toContain('{logs.map((log) => (');
    expect(logPanelSource).not.toContain('.reverse()');
    expect(logPanelSource).toContain('container.scrollTop = container.scrollHeight');
  });

  it('stops following the newest entry when the player scrolls upward', () => {
    expect(logPanelSource).toContain('stickToBottomRef.current = distanceFromBottom <= bottomThreshold');
    expect(logPanelSource).toContain('if (!open || !stickToBottomRef.current) return;');
  });
});
