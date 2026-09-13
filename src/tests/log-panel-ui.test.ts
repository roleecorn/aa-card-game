import { describe, expect, it } from 'vitest';
import logPanelSource from '../components/LogPanel.tsx?raw';

describe('game log panel UI', () => {
  it('keeps the log behind a fixed Log button', () => {
    expect(logPanelSource).toContain("position: 'fixed'");
    expect(logPanelSource).toContain('<Collapse in={open} unmountOnExit>');
    expect(logPanelSource).toContain('aria-controls="game-log-panel"');
    expect(logPanelSource).toContain('id="game-log-panel"');
    expect(logPanelSource).toContain('Log\n        </Button>');
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
