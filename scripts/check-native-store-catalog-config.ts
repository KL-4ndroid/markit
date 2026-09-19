import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateNativeStoreCatalogConfig,
  NativeStoreCatalogConfigValidationError,
  parseNativeStoreCatalogConfig,
} from '../lib/subscription/native-store-catalog-config';

const DEFAULT_INPUT_PATH =
  'docs/subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json';
const MAX_INPUT_BYTES = 64 * 1024;

class NativeStoreCatalogConfigCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function parseInputPath(args: readonly string[]): string {
  if (args.length === 0) return DEFAULT_INPUT_PATH;
  if (args.length !== 1 || !args[0].startsWith('--input=')) {
    throw new NativeStoreCatalogConfigCliError('argument_invalid');
  }
  const candidate = args[0].slice('--input='.length).trim();
  if (!candidate) throw new NativeStoreCatalogConfigCliError('argument_invalid');
  return candidate;
}

function main(): void {
  try {
    const inputPath = resolve(parseInputPath(process.argv.slice(2)));
    const stat = statSync(inputPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INPUT_BYTES) {
      throw new NativeStoreCatalogConfigCliError('input_file_invalid');
    }
    const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
    const report = evaluateNativeStoreCatalogConfig(parseNativeStoreCatalogConfig(raw));
    process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
    process.exitCode = report.readyForSandboxQuery ? 0 : 1;
  } catch (error) {
    const code = error instanceof NativeStoreCatalogConfigCliError
      || error instanceof NativeStoreCatalogConfigValidationError
      ? error.code
      : 'catalog_config_check_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

main();
