import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';
import drawPhaseSource from '../components/DrawPhaseScreen.tsx?raw';

describe('UI roster GameDefinition boundary', () => {
  it('does not duplicate Standard 3v3 roster slicing inside App', () => {
    expect(appSource).not.toMatch(/slice\(0,\s*6\)/);
    expect(appSource).not.toMatch(/slice\(0,\s*3\)/);
    expect(appSource).not.toMatch(/slice\(3,\s*6\)/);
  });

  it('does not hard-code a three-character reveal flow in DrawPhaseScreen', () => {
    expect(drawPhaseSource).not.toContain("'revealing-3'");
    expect(drawPhaseSource).not.toContain('抽出三名創作夥伴');
    expect(drawPhaseSource).not.toContain("repeat(3, minmax(0,1fr))");
  });
});
