import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateWebLaunchReadiness,
  parseWebLaunchGateDocument,
  WebLaunchGateValidationError,
} from '../lib/deployment/web-launch-gate';

const DEFAULT_INPUT_PATH = 'docs/WEB_LAUNCH_GATES_2026_08_01.json';
const MAX_INPUT_BYTES = 64 * 1024;

class WebLaunchReadinessCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function parseInputPath(args: readonly string[]): string {
  if (args.length === 0) return DEFAULT_INPUT_PATH;
  if (args.length !== 1 || !args[0].startsWith('--input=')) {
    throw new WebLaunchReadinessCliError('argument_invalid');
  }
  const candidate = args[0].slice('--input='.length).trim();
  if (!candidate) throw new WebLaunchReadinessCliError('argument_invalid');
  return candidate;
}

function main(): void {
  try {
    const inputPath = resolve(parseInputPath(process.argv.slice(2)));
    const stat = statSync(inputPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INPUT_BYTES) {
      throw new WebLaunchReadinessCliError('input_file_invalid');
    }
    const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
    const report = evaluateWebLaunchReadiness(parseWebLaunchGateDocument(raw));
    process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
    process.exitCode = report.ready ? 0 : 1;
  } catch (error) {
    const code = error instanceof WebLaunchReadinessCliError
      || error instanceof WebLaunchGateValidationError
      ? error.code
      : 'readiness_check_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

main();
