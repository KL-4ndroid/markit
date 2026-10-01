import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateNativeExternalAccountReadiness,
  NativeExternalAccountReadinessValidationError,
  parseNativeExternalAccountReadiness,
} from '../lib/deployment/native-external-account-readiness';

const DEFAULT_INPUT_PATH =
  'docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json';
const MAX_INPUT_BYTES = 64 * 1024;

class NativeExternalAccountReadinessCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function parseInputPath(args: readonly string[]): string {
  if (args.length === 0) return DEFAULT_INPUT_PATH;
  if (args.length !== 1 || !args[0].startsWith('--input=')) {
    throw new NativeExternalAccountReadinessCliError('argument_invalid');
  }
  const candidate = args[0].slice('--input='.length).trim();
  if (!candidate) throw new NativeExternalAccountReadinessCliError('argument_invalid');
  return candidate;
}

function main(): void {
  try {
    const inputPath = resolve(parseInputPath(process.argv.slice(2)));
    const stat = statSync(inputPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INPUT_BYTES) {
      throw new NativeExternalAccountReadinessCliError('input_file_invalid');
    }
    const value = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
    const report = evaluateNativeExternalAccountReadiness(
      parseNativeExternalAccountReadiness(value),
    );
    process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
    process.exitCode = report.readyForRuntimeHandoff ? 0 : 1;
  } catch (error) {
    const code = error instanceof NativeExternalAccountReadinessCliError
      || error instanceof NativeExternalAccountReadinessValidationError
      ? error.code
      : 'external_account_readiness_check_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

main();
