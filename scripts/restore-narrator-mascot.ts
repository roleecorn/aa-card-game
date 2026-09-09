import sharp from 'sharp';

const characters = ['narrator', 'ginsakura'] as const;

for (const id of characters) {
  const source = `/tmp/${id}-original.webp`;
  const portrait = `public/assets/characters/portrait/${id}.webp`;
  const compact = `public/assets/characters/compact/${id}.webp`;

  const meta = await sharp(source).metadata();
  console.log(`Original ${id} metadata:`, {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    space: meta.space,
    hasAlpha: meta.hasAlpha,
  });

  await sharp(source)
    .resize(768, 1024, {
      fit: 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .toColourspace('srgb')
    .webp({ quality: 88, alphaQuality: 95, effort: 6, smartSubsample: true })
    .toFile(portrait);

  await sharp(source)
    .resize(384, 320, {
      fit: 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .toColourspace('srgb')
    .webp({ quality: 88, alphaQuality: 95, effort: 6, smartSubsample: true })
    .toFile(compact);

  console.log(`Restored ${id} original character art.`);
}
