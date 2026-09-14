import { describe, expect, it } from 'vitest';
import draftSource from '../components/OnlineDraftScreen.tsx?raw';
import selectionCardSource from '../components/CharacterSelectionCard.tsx?raw';

describe('online draft character UI', () => {
  it('uses the normal initial-team character-card information for candidates', () => {
    expect(draftSource).toContain('CharacterSelectionCard');
    expect(draftSource).toContain("xl: 'repeat(3, minmax(0, 1fr))'");
    expect(selectionCardSource).toContain('你的初始隊伍');
    expect(selectionCardSource).toContain('技能');
    expect(selectionCardSource).toContain('skill.description');
    expect(selectionCardSource).toContain('CharacterAffinities');
    expect(selectionCardSource).toContain('getCharacterTagName');
  });

  it('renders both selected teams with the same vertical selection-card visual language', () => {
    expect(draftSource).not.toContain('CharacterCard');
    expect(draftSource).toContain('variant="rail"');
    expect(draftSource).toContain('title="我的隊伍"');
    expect(draftSource).toContain('title="對手隊伍"');
  });

  it('removes the redundant candidate summary and name-only empty summaries', () => {
    expect(draftSource).not.toContain('雙方第一位選到的角色會成為組長');
    expect(draftSource).not.toContain('尚未選擇');
    expect(draftSource).not.toContain('候選 {draft.poolIds.length}');
  });
});
