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

  it('reveals candidate cards one by one before picks become available', () => {
    expect(draftSource).toContain("type RevealPhase = 'dealing' | 'revealing' | 'ready'");
    expect(draftSource).toContain('setRevealCount(1)');
    expect(draftSource).toContain('420');
    expect(draftSource).toContain('revealed={revealReady || index < revealCount}');
    expect(draftSource).toContain('跳過抽卡動畫');
    expect(selectionCardSource).toContain("transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)'");
    expect(selectionCardSource).toContain('AutoAwesomeRoundedIcon');
  });

  it('moves a picked card into the corresponding team rail before removing it from the pool', () => {
    expect(draftSource).toContain('interface FlyingPick extends PickAnimation');
    expect(draftSource).toContain('snapshotRect(sourceNode)');
    expect(draftSource).toContain('snapshotRect(targetNode)');
    expect(draftSource).toContain('translate3d(${dx}px, ${dy}px, 0) scale(${scale})');
    expect(draftSource).toContain('transform 560ms cubic-bezier(.2,.8,.2,1)');
    expect(draftSource).toContain("selectedLabel={pickedSide === role ? '我方選擇' : '對手選擇'}");
    expect(draftSource).toContain('setHiddenPickedIds((current) => new Set(current).add(id))');
    expect(draftSource).toContain("opacity: hiddenPickedIds.has(id) ? 1 : 0");
    expect(draftSource).toContain("filter: landed ? 'drop-shadow(0 0 14px rgba(255,112,152,.42))' : 'none'");
  });

  it('keeps picked characters out of the candidate pool after the transfer finishes', () => {
    expect(draftSource).toContain('const pickedIds = new Set([...draft.hostPicks, ...draft.guestPicks])');
    expect(draftSource).toContain('const availableCharacters = characters.filter((character) => !hiddenPickedIds.has(character.id))');
    expect(draftSource).toContain('availableCharacters.map((character, index) =>');
    expect(draftSource).not.toContain('dimmed={');
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
