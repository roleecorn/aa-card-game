import { describe, expect, it } from 'vitest';
import { resolvePublicAssetPath } from '../content/publicAssetPath';

describe('resolvePublicAssetPath', () => {
  it('prefixes root-relative public assets with the GitHub Pages base path', () => {
    expect(resolvePublicAssetPath('/assets/characters/portrait/shennau.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/portrait/shennau.webp');
    expect(resolvePublicAssetPath('/assets/characters/compact/weakzhi.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/compact/weakzhi.webp');
  });

  it('keeps root deployments unchanged', () => {
    expect(resolvePublicAssetPath('/assets/characters/portrait/pigeon.webp', '/'))
      .toBe('/assets/characters/portrait/pigeon.webp');
  });

  it('does not double-prefix already based or absolute URLs', () => {
    expect(resolvePublicAssetPath('/aa-card-game/assets/characters/portrait/lanyu.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/portrait/lanyu.webp');
    expect(resolvePublicAssetPath('https://example.com/portrait.webp', '/aa-card-game/'))
      .toBe('https://example.com/portrait.webp');
  });
});
