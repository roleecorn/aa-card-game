import { promises as fs } from 'node:fs';
import path from 'node:path';
import { checkImage, convertToWebp } from './image-tools';

const PORTRAIT_WIDTH = 768;
const PORTRAIT_HEIGHT = 1024;
const COMPACT_WIDTH = 384;
const COMPACT_HEIGHT = 320;
const QUALITY = 82;
const ALPHA_QUALITY = 90;
const EFFORT = 6;
const ROOT = path.resolve('public/assets/characters');
const CONTENT_ROOT = path.resolve('src/content');

async function contentSources(): Promise<string[]> {
  const entries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join(CONTENT_ROOT, entry.name));
  return Promise.all(files.map((file) => fs.readFile(file, 'utf8')));
}

async function configuredAssets(field: 'portrait' | 'compactPortrait'): Promise<string[]> {
  const re = new RegExp(`${field}:\\s*['"]\\/?assets\\/characters\\/([^'"]+\\.webp)['"]`, 'g');
  const matches = (await contentSources()).flatMap((source) =>
    [...source.matchAll(re)].map((match) => match[1]),
  );
  return [...new Set(matches)].sort();
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
  await checkImage(filePath, {
    format: 'webp',
    width,
    height,
    singlePage: true,
    srgb: true,
  });
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
    await convertToWebp(filePath, filePath, {
      width: PORTRAIT_WIDTH,
      height: PORTRAIT_HEIGHT,
      fit: 'fill',
      quality: QUALITY,
      alphaQuality: ALPHA_QUALITY,
      effort: EFFORT,
    });
  }
  await validate();
}

const command = process.argv[2] ?? 'validate';
if (command === 'validate') await validate();
else if (command === 'normalize') await normalize();
else throw new Error(`Unknown command "${command}". Use "normalize" or "validate".`);
