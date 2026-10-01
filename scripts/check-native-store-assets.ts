import { readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import sharp from 'sharp';

import {
  evaluateNativeStoreAssets,
  NativeStoreAssetFormat,
  NativeStoreImageMetadata,
} from '../lib/deployment/native-store-asset-preflight';

class NativeStoreAssetCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function parseRoot(args: readonly string[]): string {
  if (args.length === 0) return process.cwd();
  if (args.length !== 1 || !args[0].startsWith('--root=')) {
    throw new NativeStoreAssetCliError('argument_invalid');
  }
  const candidate = args[0].slice('--root='.length).trim();
  if (!candidate) throw new NativeStoreAssetCliError('argument_invalid');
  return resolve(candidate);
}

function normalizeFormat(format: string | undefined): NativeStoreAssetFormat {
  if (format === 'png') return 'png';
  if (format === 'jpeg' || format === 'jpg') return 'jpeg';
  return 'other';
}

async function inspectImage(path: string): Promise<NativeStoreImageMetadata> {
  const file = statSync(path);
  if (!file.isFile() || file.size <= 0) throw new NativeStoreAssetCliError('asset_invalid');
  const metadata = await sharp(path).metadata();
  if (!metadata.width || !metadata.height || !metadata.channels) {
    throw new NativeStoreAssetCliError('asset_invalid');
  }
  return Object.freeze({
    format: normalizeFormat(metadata.format),
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha ?? false,
    channels: metadata.channels,
    sizeBytes: file.size,
  });
}

async function inspectOptional(path: string): Promise<NativeStoreImageMetadata | null> {
  try {
    return await inspectImage(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function inspectDirectory(path: string): Promise<readonly NativeStoreImageMetadata[]> {
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Object.freeze([]);
    throw error;
  }

  const candidates = entries
    .filter(entry => entry.isFile() && ['.png', '.jpg', '.jpeg'].includes(
      extname(entry.name).toLowerCase(),
    ))
    .map(entry => join(path, entry.name))
    .sort((left, right) => left.localeCompare(right));
  return Object.freeze(await Promise.all(candidates.map(inspectImage)));
}

async function main(): Promise<void> {
  try {
    const root = parseRoot(process.argv.slice(2));
    if (!statSync(root).isDirectory()) throw new NativeStoreAssetCliError('root_invalid');

    const report = evaluateNativeStoreAssets({
      iosAppIcon: await inspectOptional(join(root, 'store-assets/ios/app-icon-1024.png')),
      googlePlayIcon: await inspectOptional(join(root, 'store-assets/google/app-icon-512.png')),
      googleFeatureGraphic: await inspectOptional(
        join(root, 'store-assets/google/feature-graphic-1024x500.png'),
      ),
      iosPhoneScreenshots: await inspectDirectory(
        join(root, 'store-assets/ios/screenshots/zh-TW'),
      ),
      googlePhoneScreenshots: await inspectDirectory(
        join(root, 'store-assets/google/screenshots/zh-TW'),
      ),
    });
    process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
    process.exitCode = report.ready ? 0 : 1;
  } catch (error) {
    const code = error instanceof NativeStoreAssetCliError
      ? error.code
      : 'asset_check_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

void main();
