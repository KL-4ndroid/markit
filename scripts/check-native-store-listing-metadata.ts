import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateNativeStoreListingMetadata,
  NativeStoreListingMetadataValidationError,
  parseNativeStoreListingMetadata,
} from '../lib/deployment/native-store-listing-metadata';

const DEFAULT_INPUT_PATH =
  'docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json';
const MAX_INPUT_BYTES = 64 * 1024;

class NativeStoreListingMetadataCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function parseInputPath(args: readonly string[]): string {
  if (args.length === 0) return DEFAULT_INPUT_PATH;
  if (args.length !== 1 || !args[0].startsWith('--input=')) {
    throw new NativeStoreListingMetadataCliError('argument_invalid');
  }
  const candidate = args[0].slice('--input='.length).trim();
  if (!candidate) throw new NativeStoreListingMetadataCliError('argument_invalid');
  return candidate;
}

function main(): void {
  try {
    const inputPath = resolve(parseInputPath(process.argv.slice(2)));
    const stat = statSync(inputPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INPUT_BYTES) {
      throw new NativeStoreListingMetadataCliError('input_file_invalid');
    }
    const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
    const report = evaluateNativeStoreListingMetadata(parseNativeStoreListingMetadata(raw));
    process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
    process.exitCode = report.readyForConsoleEntry ? 0 : 1;
  } catch (error) {
    const code = error instanceof NativeStoreListingMetadataCliError
      || error instanceof NativeStoreListingMetadataValidationError
      ? error.code
      : 'store_metadata_check_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

main();
