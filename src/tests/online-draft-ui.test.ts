import { describe, expect, it } from 'vitest';
import draftSource from '../components/OnlineDraftScreen.tsx?raw';
import selectionCardSource from '../components/CharacterSelectionCard.tsx?raw';

describe('online draft character UI', () => {
  it('uses the full pre-match character information for draft candidates', () => {
    expect(draftSource).toContain('CharacterSelectionCard');
    expect(selectionCardSource).toContain('技能');
    expect(selectionCardSource).toContain('skill.description');
    expect(selectionCardSource).toContain('CharacterAffinities');
    expect(selectionCardSource).toContain('getCharacterTagName');
  });

  it('shows selected teams as the same compact character cards used in battle', () => {
    expect(draftSource).toContain('CharacterCard');
    expect(draftSource).toContain('compact');
    expect(draftSource).toContain('title="我的隊伍"');
    expect(draftSource).toContain('title="對手隊伍"');
  });

  it('removes the redundant candidate summary and name-only empty summaries', () => {
    expect(draftSource).not.toContain('雙方第一位選到的角色會成為組長');
    expect(draftSource).not.toContain('尚未選擇');
    expect(draftSource).not.toContain('候選 {draft.poolIds.length}');
  });
});
