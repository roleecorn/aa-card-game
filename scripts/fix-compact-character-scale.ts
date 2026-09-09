import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public/assets/characters');
const IDS = ['pintbox','mashiro','user79','narrator','ginsakura','bluewind'];

for (const id of IDS) {
  const source = path.join(ROOT, 'portrait', `${id}.webp`);
  const target = path.join(ROOT, 'compact', `${id}.webp`);
  await sharp(source)
    .extract({ left: 0, top: 0, width: 768, height: 640 })
    .resize(384, 320, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(`${target}.tmp`);
  await sharp(`${target}.tmp`).toFile(target);
}
