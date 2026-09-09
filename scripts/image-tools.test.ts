import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { assertWebPContainer, checkImage, convertToWebp, inspectImage } from './image-tools';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa-card-image-tools-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('image tools', () => {
  it('inspects image dimensions and format', async () => {
    const dir = await makeTempDir();
    const file = path.join(dir, 'source.png');
    await sharp({
      create: { width: 120, height: 80, channels: 4, background: { r: 20, g: 40, b: 60, alpha: 1 } },
    }).png().toFile(file);

    const info = await inspectImage(file);
    expect(info.format).toBe('png');
    expect(info.width).toBe(120);
    expect(info.height).toBe(80);
    expect(info.pages).toBe(1);
  });

  it('converts to a valid WebP with exact requested size', async () => {
    const dir = await makeTempDir();
    const input = path.join(dir, 'source.png');
    const output = path.join(dir, 'nested', 'portrait.webp');
    await sharp({
      create: { width: 300, height: 200, channels: 3, background: { r: 80, g: 120, b: 160 } },
    }).png().toFile(input);

    const info = await convertToWebp(input, output, { width: 768, height: 1024, fit: 'cover', quality: 82 });
    expect(info.format).toBe('webp');
    expect(info.width).toBe(768);
    expect(info.height).toBe(1024);

    const buffer = await fs.readFile(output);
    expect(() => assertWebPContainer(buffer, output)).not.toThrow();
  });

  it('rejects wrong dimensions when checking an asset', async () => {
    const dir = await makeTempDir();
    const file = path.join(dir, 'wrong.webp');
    await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).webp().toFile(file);

    await expect(checkImage(file, { format: 'webp', width: 384, height: 320, singlePage: true }))
      .rejects.toThrow('expected width 384');
  });

  it('rejects truncated WebP containers before metadata is trusted', async () => {
    const dir = await makeTempDir();
    const file = path.join(dir, 'truncated.webp');
    const full = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } },
    }).webp().toBuffer();
    const truncated = full.subarray(0, full.length - 5);
    await fs.writeFile(file, truncated);

    await expect(inspectImage(file)).rejects.toThrow(/truncated\/corrupt WebP|Input buffer/);
  });

  it('requires width and height together for conversion', async () => {
    const dir = await makeTempDir();
    const input = path.join(dir, 'source.png');
    const output = path.join(dir, 'output.webp');
    await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 1, g: 1, b: 1 } },
    }).png().toFile(input);

    await expect(convertToWebp(input, output, { width: 768 })).rejects.toThrow('width and height must be provided together');
  });
});
