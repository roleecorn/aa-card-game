import { describe, expect, it } from 'vitest';
import { BASE_DECK, CARDS } from '../src/content/catalog';
import { cardList } from '../src/content/cards';
import { hasCardHandler } from '../src/game/cardHandlers';

describe('card authoring contract', () => {
  it('keeps card ids unique before catalog indexing', () => {
    const ids = cardList.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(CARDS).sort()).toEqual([...ids].sort());
  });

  it('keeps every card executable through effects and/or a registered custom handler', () => {
    for (const card of cardList) {
      expect(Boolean(card.effects?.length || card.customHandler), `${card.id} needs runtime behavior`).toBe(true);
      if (card.customHandler) {
        expect(hasCardHandler(card.customHandler), `${card.id} custom handler ${card.customHandler}`).toBe(true);
      }
    }
  });

  it('keeps coordination-only stress metadata off event cards', () => {
    for (const card of cardList) {
      if (card.kind === 'event') {
        expect(card.coordinationStressCost, `${card.id} is an event card`).toBeUndefined();
      }
    }
  });

  it('keeps every Standard deck entry backed by a registered card definition', () => {
    expect(BASE_DECK.length).toBeGreaterThan(0);
    for (const cardId of BASE_DECK) expect(CARDS[cardId], `missing card ${cardId}`).toBeDefined();
  });
});
