import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const WIDTH = 768;
const HEIGHT = 1024;
const RATIO = WIDTH / HEIGHT;
const QUALITY = 82;
const ALPHA_QUALITY = 90;
const EFFORT = 6;
const DEFAULT_DIR = path.resolve('public/assets/characters');

function assertWebPContainer(buffer: Buffer, file: string): void {
  if (buffer.length < 20) throw new Error(`${file}: file is too small to be a valid WebP`);
  if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF') throw new Error(`${file}: missing RIFF header`);
  if (buffer.subarray(8, 12).toString('ascii') !== 'WEBP') throw new Error(`${file}: missing WEBP signature`);
  const declaredTotal = buffer.readUInt32LE(4) + 8;
  if (declaredTotal !== buffer.length) {
    throw new Error(`${file}: truncated/corrupt WebP; RIFF declares ${declaredTotal} bytes but file has ${buffer.length}`);
  }
}

async function portraitNames(): Promise<string[]> {
  const source = await fs.readFile(path.resolve('src/content/characters.ts'), 'utf8');
  const matches = [...source.matchAll(/portrait:\s*['"]\/assets\/characters\/([^'"]+\.webp)['"]/g)];
  return [...new Set(matches.map((match) => match[1]))].sort();
}

async function validateOne(filePath: string): Promise<void> {
  const buffer = await fs.readFile(filePath);
  assertWebPContainer(buffer, filePath);
  const metadata = await sharp(buffer, { animated: true }).metadata();
  if (metadata.format !== 'webp') throw new Error(`${filePath}: expected WebP, got ${metadata.format ?? 'unknown'}`);
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
    throw new Error(`${filePath}: expected ${WIDTH}x${HEIGHT}, got ${metadata.width}x${metadata.height}`);
  }
  if ((metadata.pages ?? 1) !== 1) throw new Error(`${filePath}: animated/multi-page WebP is not allowed`);
  if (metadata.space && metadata.space !== 'srgb') {
    throw new Error(`${filePath}: expected sRGB, got ${metadata.space}`);
  }
}

async function validate(dir = DEFAULT_DIR): Promise<void> {
  const names = await portraitNames();
  const entries = new Set(await fs.readdir(dir));
  const missing = names.filter((name) => !entries.has(name));
  if (missing.length) throw new Error(`Missing character portraits: ${missing.join(', ')}`);
  for (const name of names) await validateOne(path.join(dir, name));
  console.log(`Validated ${names.length} character portraits: WebP, ${WIDTH}x${HEIGHT}, single-frame, complete RIFF containers.`);
}

async function normalizeOne(filePath: string): Promise<void> {
  const input = await fs.readFile(filePath);
  // Decode first. A truncated input must fail instead of being silently rewritten.
  const metadata = await sharp(input, { animated: true }).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`${filePath}: cannot read dimensions`);
  if ((metadata.pages ?? 1) !== 1) throw new Error(`${filePath}: animated/multi-page input is not allowed`);
  const ratio = metadata.width / metadata.height;
  if (Math.abs(ratio - RATIO) > 0.001) {
    throw new Error(`${filePath}: source must already be 3:4; got ${metadata.width}x${metadata.height}`);
  }

  const output = await sharp(input)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .webp({
      quality: QUALITY,
      alphaQuality: ALPHA_QUALITY,
      effort: EFFORT,
      smartSubsample: true,
    })
    .toBuffer();

  assertWebPContainer(output, filePath);
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, output);
  await fs.rename(tmp, filePath);
}

async function normalize(dir = DEFAULT_DIR): Promise<void> {
  const names = await portraitNames();
  for (const name of names) {
    const filePath = path.join(dir, name);
    await normalizeOne(filePath);
    console.log(`normalized ${name}`);
  }
  await validate(dir);
}

const command = process.argv[2] ?? 'validate';
if (command === 'validate') await validate();
else if (command === 'normalize') await normalize();
else throw new Error(`Unknown command "${command}". Use "normalize" or "validate".`);
