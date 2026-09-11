import { describe, expect, it } from 'vitest';
import { resolvePublicAssetPath } from '../content/publicAssetPath';

describe('resolvePublicAssetPath', () => {
  it('prefixes repository-relative public assets with the GitHub Pages base path', () => {
    expect(resolvePublicAssetPath('assets/characters/portrait/shennau.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/portrait/shennau.webp');
    expect(resolvePublicAssetPath('assets/characters/compact/weakzhi.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/compact/weakzhi.webp');
  });

  it('resolves repository-relative assets for a root deployment without requiring root-absolute source paths', () => {
    expect(resolvePublicAssetPath('assets/characters/portrait/pigeon.webp', '/'))
      .toBe('/assets/characters/portrait/pigeon.webp');
  });

  it('normalizes legacy root-relative values without double-prefixing already based or external URLs', () => {
    expect(resolvePublicAssetPath('/assets/characters/portrait/shennau.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/portrait/shennau.webp');
    expect(resolvePublicAssetPath('/aa-card-game/assets/characters/portrait/lanyu.webp', '/aa-card-game/'))
      .toBe('/aa-card-game/assets/characters/portrait/lanyu.webp');
    expect(resolvePublicAssetPath('https://example.com/portrait.webp', '/aa-card-game/'))
      .toBe('https://example.com/portrait.webp');
  });
});
