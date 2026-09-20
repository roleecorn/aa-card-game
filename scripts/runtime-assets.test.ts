import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/content/catalog';

const ROOT = process.cwd();
const abs = (...parts: string[]) => path.join(ROOT, ...parts);

const LEGACY_COMPACT_DIMENSION_EXCEPTIONS = [
  'adao.webp',
  'axu.webp',
  'chidori.webp',
  'e.webp',
  'enki.webp',
  'eryang.webp',
  'ingrid.webp',
  'linlan.webp',
  'orangeangel.webp',
  'pray.webp',
  'ta.webp',
  'tiantichilun.webp',
  'zhise.webp',
] as const;

async function entries(dir: string) {
  return fs.readdir(abs(dir), { withFileTypes: true });
}

async function filesRecursive(dir: string): Promise<string[]> {
  const root = abs(dir);
  const out: string[] = [];
  async function walk(current: string) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(path.relative(ROOT, full).replaceAll('\\', '/'));
    }
  }
  await walk(root);
  return out.sort();
}

async function productionSourceFiles(): Promise<string[]> {
  const all = await filesRecursive('src');
  return all.filter((file) => /\.(?:ts|tsx|css)$/.test(file) && !file.includes('/tests/') && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'));
}

function basenames(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value)).map((value) => path.posix.basename(value)).sort();
}

async function headImageMetadata(file: string) {
  const buffer = execFileSync('git', ['show', `HEAD:${file}`], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 16 * 1024 * 1024,
  });
  return sharp(buffer).metadata();
}

describe('runtime asset registry', () => {
  it('keeps public/assets limited to registered card and character families', async () => {
    const rootEntries = await entries('public/assets');
    expect(rootEntries.map((entry) => entry.name).sort()).toEqual(['cards', 'characters']);
    expect(rootEntries.every((entry) => entry.isDirectory())).toBe(true);

    const cardFiles = await filesRecursive('public/assets/cards');
    expect(cardFiles.length).toBeGreaterThan(0);
    expect(cardFiles.every((file) => file.endsWith('.svg'))).toBe(true);
  });

  it('keeps character directories exact, paired and free of scratch files', async () => {
    const expectedPortraits = basenames(Object.values(CHARACTERS).map((character) => character.portrait));
    const expectedCompacts = basenames(Object.values(CHARACTERS).map((character) => character.compactPortrait));
    const actualPortraits = (await entries('public/assets/characters/portrait')).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    const actualCompacts = (await entries('public/assets/characters/compact')).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();

    expect(actualPortraits).toEqual(expectedPortraits);
    expect(actualCompacts).toEqual(expectedCompacts);
    expect(actualPortraits.every((name) => /^[a-z0-9-]+\.webp$/.test(name))).toBe(true);
    expect(actualCompacts.every((name) => /^[a-z0-9-]+\.webp$/.test(name))).toBe(true);
  });

  it('locks checked-in character dimensions and permits only the documented legacy compact exceptions', async () => {
    const portraitFiles = basenames(Object.values(CHARACTERS).map((character) => character.portrait));
    for (const name of portraitFiles) {
      const metadata = await headImageMetadata(`public/assets/characters/portrait/${name}`);
      expect(metadata.width, `${name} portrait width`).toBe(768);
      expect(metadata.height, `${name} portrait height`).toBe(1024);
    }

    const compactFiles = basenames(Object.values(CHARACTERS).map((character) => character.compactPortrait));
    const observedLegacy: string[] = [];
    for (const name of compactFiles) {
      const metadata = await headImageMetadata(`public/assets/characters/compact/${name}`);
      if (metadata.width === 384 && metadata.height === 320) continue;

      expect(metadata.width, `${name} legacy compact width`).toBe(384);
      expect(metadata.height, `${name} legacy compact height`).toBe(512);
      observedLegacy.push(name);
    }

    expect(observedLegacy.sort()).toEqual([...LEGACY_COMPACT_DIMENSION_EXCEPTIONS].sort());
  });

  it('keeps source-bundled UI assets vector-only and self-contained', async () => {
    const uiAssets = await filesRecursive('src/assets');
    expect(uiAssets.length).toBeGreaterThan(0);
    for (const file of uiAssets) {
      expect(file.endsWith('.svg'), `${file} must be SVG`).toBe(true);
      const source = await fs.readFile(abs(file), 'utf8');
      expect(source, `${file} must have a viewBox`).toMatch(/<svg\b[^>]*\bviewBox=/i);
      expect(source, `${file} must not embed raster images`).not.toMatch(/<image\b/i);
      const withoutStandardNamespace = source.replace('http://www.w3.org/2000/svg', '');
      expect(withoutStandardNamespace, `${file} must not depend on external URLs`).not.toMatch(/https?:\/\//i);
    }
  });

  it('rejects tracked scratch/backup files from runtime asset trees', async () => {
    const runtimeFiles = [
      ...(await filesRecursive('public/assets')),
      ...(await filesRecursive('src/assets')),
    ];
    expect(runtimeFiles.filter((file) => /(?:\.tmp|\.bak|~)$/i.test(file))).toEqual([]);
  });

  it('keeps production public-asset references deployment-base-safe', async () => {
    const offenders: string[] = [];
    for (const file of await productionSourceFiles()) {
      const source = await fs.readFile(abs(file), 'utf8');
      if (/['"]\/assets\//.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps documentation reference art out of runtime source', async () => {
    const offenders: string[] = [];
    for (const file of await productionSourceFiles()) {
      const source = await fs.readFile(abs(file), 'utf8');
      if (/docs\/art\//.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the bundled UI font family explicit and licensed', async () => {
    const fontEntries = (await entries('public/fonts')).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    expect(fontEntries).toEqual(['OFL.txt', 'README.md', 'noto-sans-tc-ui.woff2']);
    const font = await fs.readFile(abs('public/fonts/noto-sans-tc-ui.woff2'));
    expect(font.subarray(0, 4).toString('ascii')).toBe('wOF2');
  });
});
