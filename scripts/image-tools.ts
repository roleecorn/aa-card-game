import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp, { type FitEnum } from 'sharp';

export interface ImageInfo {
  file: string;
  format?: string;
  width?: number;
  height?: number;
  pages: number;
  space?: string;
  size: number;
}

export interface ImageCheck {
  width?: number;
  height?: number;
  format?: string;
  singlePage?: boolean;
  srgb?: boolean;
}

export interface WebpConvertOptions {
  width?: number;
  height?: number;
  fit?: keyof FitEnum;
  quality?: number;
  alphaQuality?: number;
  effort?: number;
}

export function assertWebPContainer(buffer: Buffer, file: string): void {
  if (buffer.length < 20) throw new Error(`${file}: file is too small to be a valid WebP`);
  if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF') throw new Error(`${file}: missing RIFF header`);
  if (buffer.subarray(8, 12).toString('ascii') !== 'WEBP') throw new Error(`${file}: missing WEBP signature`);
  const declaredTotal = buffer.readUInt32LE(4) + 8;
  if (declaredTotal !== buffer.length) {
    throw new Error(`${file}: truncated/corrupt WebP; RIFF declares ${declaredTotal} bytes but file has ${buffer.length}`);
  }
}

export async function inspectImage(file: string): Promise<ImageInfo> {
  const buffer = await fs.readFile(file);
  const metadata = await sharp(buffer, { animated: true }).metadata();
  if (metadata.format === 'webp') assertWebPContainer(buffer, file);
  return {
    file,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    pages: metadata.pages ?? 1,
    space: metadata.space,
    size: buffer.length,
  };
}

export async function checkImage(file: string, expected: ImageCheck): Promise<ImageInfo> {
  const info = await inspectImage(file);
  if (expected.format && info.format !== expected.format) {
    throw new Error(`${file}: expected ${expected.format}, got ${info.format ?? 'unknown'}`);
  }
  if (expected.width !== undefined && info.width !== expected.width) {
    throw new Error(`${file}: expected width ${expected.width}, got ${info.width ?? 'unknown'}`);
  }
  if (expected.height !== undefined && info.height !== expected.height) {
    throw new Error(`${file}: expected height ${expected.height}, got ${info.height ?? 'unknown'}`);
  }
  if (expected.singlePage && info.pages !== 1) {
    throw new Error(`${file}: expected a single-frame image, got ${info.pages} pages/frames`);
  }
  if (expected.srgb && info.space && info.space !== 'srgb') {
    throw new Error(`${file}: expected sRGB, got ${info.space}`);
  }
  return info;
}

export async function convertToWebp(input: string, output: string, options: WebpConvertOptions = {}): Promise<ImageInfo> {
  const {
    width,
    height,
    fit = 'cover',
    quality = 82,
    alphaQuality = 90,
    effort = 6,
  } = options;

  if ((width === undefined) !== (height === undefined)) {
    throw new Error('width and height must be provided together');
  }
  if (quality < 1 || quality > 100) throw new Error('quality must be between 1 and 100');
  if (alphaQuality < 1 || alphaQuality > 100) throw new Error('alphaQuality must be between 1 and 100');
  if (effort < 0 || effort > 6) throw new Error('effort must be between 0 and 6');

  const inputBuffer = await fs.readFile(input);
  const inputMeta = await sharp(inputBuffer, { animated: true }).metadata();
  if ((inputMeta.pages ?? 1) !== 1) throw new Error(`${input}: animated/multi-page input is not allowed`);

  let pipeline = sharp(inputBuffer).rotate();
  if (width !== undefined && height !== undefined) {
    pipeline = pipeline.resize(width, height, { fit, kernel: sharp.kernel.lanczos3 });
  }

  const outputBuffer = await pipeline
    .toColourspace('srgb')
    .webp({ quality, alphaQuality, effort, smartSubsample: true })
    .toBuffer();

  assertWebPContainer(outputBuffer, output);
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  const tmp = `${output}.tmp-${process.pid}`;
  await fs.writeFile(tmp, outputBuffer);
  await fs.rename(tmp, output);

  return inspectImage(output);
}

function parseArgs(args: string[]): { positional: string[]; flags: Map<string, string> } {
  const positional: string[] = [];
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      flags.set(arg.slice(2, eq), arg.slice(eq + 1));
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) flags.set(key, 'true');
    else {
      flags.set(key, next);
      i += 1;
    }
  }
  return { positional, flags };
}

function numberFlag(flags: Map<string, string>, name: string): number | undefined {
  const raw = flags.get(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be a number`);
  return value;
}

function printInfo(info: ImageInfo): void {
  console.log(
    `${info.file}: ${info.format ?? 'unknown'} ${info.width ?? '?'}x${info.height ?? '?'} ` +
    `pages=${info.pages} space=${info.space ?? 'unknown'} bytes=${info.size}`,
  );
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);

  if (command === 'inspect') {
    if (!positional.length) throw new Error('Usage: image:inspect -- <file> [file...]');
    for (const file of positional) printInfo(await inspectImage(file));
    return;
  }

  if (command === 'check') {
    const [file] = positional;
    if (!file) throw new Error('Usage: image:check -- <file> [--width N --height N --format webp --single-page --srgb]');
    const info = await checkImage(file, {
      width: numberFlag(flags, 'width'),
      height: numberFlag(flags, 'height'),
      format: flags.get('format'),
      singlePage: flags.has('single-page'),
      srgb: flags.has('srgb'),
    });
    printInfo(info);
    return;
  }

  if (command === 'convert') {
    const [input, output] = positional;
    if (!input || !output) {
      throw new Error('Usage: image:webp -- <input> <output> [--width N --height N --fit cover|contain|fill --quality N]');
    }
    const fit = flags.get('fit') as keyof FitEnum | undefined;
    if (fit && !['cover', 'contain', 'fill', 'inside', 'outside'].includes(fit)) {
      throw new Error(`Unsupported --fit ${fit}`);
    }
    const info = await convertToWebp(input, output, {
      width: numberFlag(flags, 'width'),
      height: numberFlag(flags, 'height'),
      fit,
      quality: numberFlag(flags, 'quality'),
      alphaQuality: numberFlag(flags, 'alpha-quality'),
      effort: numberFlag(flags, 'effort'),
    });
    printInfo(info);
    return;
  }

  throw new Error('Usage: image-tools.ts <inspect|check|convert> ...');
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
