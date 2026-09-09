import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public/assets/characters');
const PORTRAIT_DIR = path.join(ROOT, 'portrait');
const COMPACT_DIR = path.join(ROOT, 'compact');
const COMPACT_WIDTH = 384;
const COMPACT_HEIGHT = 320;

const portraits = ['pintbox','mashiro','user79','narrator','ginsakura','bluewind','triangle','fengyang','happy','chaos'];
const existingCompact = new Set(['triangle','fengyang','happy','chaos']);

await fs.mkdir(PORTRAIT_DIR, { recursive: true });
await fs.mkdir(COMPACT_DIR, { recursive: true });

for (const id of portraits) {
  const source = path.join(ROOT, `${id}.webp`);
  const portraitTarget = path.join(PORTRAIT_DIR, `${id}.webp`);
  await fs.copyFile(source, portraitTarget);

  const compactSource = existingCompact.has(id)
    ? path.join(ROOT, `${id}-compact.webp`)
    : source;

  const pipeline = sharp(compactSource).rotate();
  const output = existingCompact.has(id)
    ? pipeline.resize(COMPACT_WIDTH, COMPACT_HEIGHT, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    : pipeline.resize(COMPACT_WIDTH, COMPACT_HEIGHT, { fit: 'cover', position: 'attention', kernel: sharp.kernel.lanczos3 });

  await output
    .toColourspace('srgb')
    .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(path.join(COMPACT_DIR, `${id}.webp`));
}
