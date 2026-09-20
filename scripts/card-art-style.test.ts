import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BASE_DECK, CARDS } from '../src/content/catalog';

const newReferenceMap: Record<string, string[]> = {
  'one-on-one.svg': ['guide.svg', 'voice.svg'],
  'inspiration.svg': ['polish.svg', 'rush.svg'],
  'accident.svg': ['overtime.svg'],
  'tech-failure.svg': ['writer-block.svg', 'overtime.svg'],
  'thought-block.svg': ['writer-block.svg'],
};

function readCardSvg(fileName: string): string {
  return readFileSync(resolve(process.cwd(), 'public/assets/cards', fileName), 'utf8');
}

describe('canonical individual card-art SVG contract', () => {
  it('keeps every Standard-deck card on the existing 768x480 textured SVG format', () => {
    for (const cardId of [...new Set(BASE_DECK)]) {
      const art = CARDS[cardId]?.art;
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

  it('records existing SVG references for every card art added by this discussion update', () => {
    for (const [fileName, references] of Object.entries(newReferenceMap)) {
      const source = readCardSvg(fileName);
      expect(source).toContain('References:');
      for (const reference of references) expect(source).toContain(reference);
    }
  });
});
