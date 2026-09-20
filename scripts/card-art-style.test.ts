import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/catalog';

const CARD_ART_DIR = resolve(process.cwd(), 'public/assets/cards');

const newReferenceMap: Record<string, string[]> = {
  'one-on-one.svg': ['guide.svg', 'voice.svg'],
  'inspiration.svg': ['polish.svg', 'rush.svg'],
  'accident.svg': ['overtime.svg'],
  'tech-failure.svg': ['writer-block.svg', 'overtime.svg'],
  'thought-block.svg': ['writer-block.svg'],
};

function readCardSvg(fileName: string): string {
  return readFileSync(resolve(CARD_ART_DIR, fileName), 'utf8');
}

function definedCardArtFileNames(): string[] {
  return [...new Set(Object.values(CARDS).map((card) => card.art?.split('/').at(-1)).filter((name): name is string => Boolean(name)))].sort();
}

describe('canonical individual card-art SVG contract', () => {
  it('keeps every defined card on the existing 768x480 textured SVG format', () => {
    for (const [cardId, card] of Object.entries(CARDS)) {
      const art = card.art;
      expect(art, `${cardId} should expose art`).toBeTruthy();
      expect(art, `${cardId} should use SVG`).toMatch(/assets\/cards\/[a-z0-9-]+\.svg$/);

      const fileName = art!.split('/').at(-1)!;
      const source = readCardSvg(fileName);
      expect(source, `${fileName} should keep the canonical canvas`).toContain('viewBox="0 0 768 480"');
      expect(source, `${fileName} should keep paper texture`).toContain('id="paper"');
      expect(source, `${fileName} should keep crayon texture`).toContain('id="crayon"');
      expect(source, `${fileName} must not embed raster art`).not.toMatch(/<image\b/i);
    }
  });

  it('keeps the card-art directory exact to the assets referenced by card definitions', () => {
    const actual = readdirSync(CARD_ART_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    expect(actual).toEqual(definedCardArtFileNames());
  });

  it('records existing SVG references for every card art added by this discussion update', () => {
    for (const [fileName, references] of Object.entries(newReferenceMap)) {
      const source = readCardSvg(fileName);
      expect(source).toContain('References:');
      for (const reference of references) expect(source).toContain(reference);
    }
  });
});
