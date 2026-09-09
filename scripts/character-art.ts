import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PORTRAIT_WIDTH = 768;
const PORTRAIT_HEIGHT = 1024;
const COMPACT_WIDTH = 384;
const COMPACT_HEIGHT = 320;
const QUALITY = 82;
const ALPHA_QUALITY = 90;
const EFFORT = 6;
const ROOT = path.resolve('public/assets/characters');

function assertWebPContainer(buffer: Buffer, file: string): void {
  if (buffer.length < 20) throw new Error(`${file}: file is too small to be a valid WebP`);
  if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF') throw new Error(`${file}: missing RIFF header`);
  if (buffer.subarray(8, 12).toString('ascii') !== 'WEBP') throw new Error(`${file}: missing WEBP signature`);
  const declaredTotal = buffer.readUInt32LE(4) + 8;
  if (declaredTotal !== buffer.length) {
    throw new Error(`${file}: truncated/corrupt WebP; RIFF declares ${declaredTotal} bytes but file has ${buffer.length}`);
  }
}

async function configuredAssets(field: 'portrait' | 'compactPortrait'): Promise<string[]> {
  const source = await fs.readFile(path.resolve('src/content/characters.ts'), 'utf8');
  const re = new RegExp(`${field}:\\s*['\"]\\/assets\\/characters\\/([^'\"]+\\.webp)['\"]`, 'g');
  return [...source.matchAll(re)].map((match) => match[1]).sort();
}

function idsFrom(paths: string[], prefix: string): string[] {
  return paths.map((p) => {
    if (!p.startsWith(prefix + '/') || !p.endsWith('.webp')) {
      throw new Error(`Unexpected character asset path: ${p}`);
    }
    return path.basename(p, '.webp');
  }).sort();
}

async function validateOne(filePath: string, width: number, height: number): Promise<void> {
  const buffer = await fs.readFile(filePath);
  assertWebPContainer(buffer, filePath);
  const metadata = await sharp(buffer, { animated: true }).metadata();
  if (metadata.format !== 'webp') throw new Error(`${filePath}: expected WebP, got ${metadata.format ?? 'unknown'}`);
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`${filePath}: expected ${width}x${height}, got ${metadata.width}x${metadata.height}`);
  }
  if ((metadata.pages ?? 1) !== 1) throw new Error(`${filePath}: animated/multi-page WebP is not allowed`);
  if (metadata.space && metadata.space !== 'srgb') throw new Error(`${filePath}: expected sRGB, got ${metadata.space}`);
}

async function validate(): Promise<void> {
  const portraits = await configuredAssets('portrait');
  const compacts = await configuredAssets('compactPortrait');
  const portraitIds = idsFrom(portraits, 'portrait');
  const compactIds = idsFrom(compacts, 'compact');

  if (portraitIds.join('\n') !== compactIds.join('\n')) {
    const missing = portraitIds.filter((id) => !compactIds.includes(id));
    const extra = compactIds.filter((id) => !portraitIds.includes(id));
    throw new Error(`portrait/compact mismatch; missing compact: ${missing.join(', ') || 'none'}; extra compact: ${extra.join(', ') || 'none'}`);
  }

  for (const rel of portraits) await validateOne(path.join(ROOT, rel), PORTRAIT_WIDTH, PORTRAIT_HEIGHT);
  for (const rel of compacts) await validateOne(path.join(ROOT, rel), COMPACT_WIDTH, COMPACT_HEIGHT);
  console.log(`Validated ${portraits.length} portrait and ${compacts.length} compact character assets.`);
}

async function normalize(): Promise<void> {
  const portraits = await configuredAssets('portrait');
  for (const rel of portraits) {
    const filePath = path.join(ROOT, rel);
    const input = await fs.readFile(filePath);
    const metadata = await sharp(input, { animated: true }).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`${filePath}: cannot read dimensions`);
    if ((metadata.pages ?? 1) !== 1) throw new Error(`${filePath}: animated/multi-page input is not allowed`);
    const output = await sharp(input)
      .rotate()
      .resize(PORTRAIT_WIDTH, PORTRAIT_HEIGHT, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .toColourspace('srgb')
      .webp({ quality: QUALITY, alphaQuality: ALPHA_QUALITY, effort: EFFORT, smartSubsample: true })
      .toBuffer();
    assertWebPContainer(output, filePath);
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, output);
    await fs.rename(tmp, filePath);
  }
  await validate();
}

const command = process.argv[2] ?? 'validate';
if (command === 'validate') await validate();
else if (command === 'normalize') await normalize();
else throw new Error(`Unknown command "${command}". Use "normalize" or "validate".`);
