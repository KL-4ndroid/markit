import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateLaunchExecutionPlan,
  LaunchExecutionPlanValidationError,
  parseLaunchExecutionPlan,
} from '../lib/deployment/launch-execution-plan';
import { parseNativeLaunchGateDocument } from '../lib/deployment/native-launch-gate';
import { parseWebLaunchGateDocument } from '../lib/deployment/web-launch-gate';

const DEFAULT_INPUT_PATH = 'docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json';
const WEB_GATES_PATH = 'docs/WEB_LAUNCH_GATES_2026_08_01.json';
const NATIVE_GATES_PATH = 'docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json';
const MAX_INPUT_BYTES = 256 * 1024;

class LaunchExecutionPlanCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function parseInputPath(args: readonly string[]): string {
  if (args.length === 0) return DEFAULT_INPUT_PATH;
  if (args.length !== 1 || !args[0].startsWith('--input=')) {
    throw new LaunchExecutionPlanCliError('argument_invalid');
  }
  const value = args[0].slice('--input='.length).trim();
  if (!value) throw new LaunchExecutionPlanCliError('argument_invalid');
  return value;
}

function readJson(path: string): unknown {
  const absolutePath = resolve(path);
  const stat = statSync(absolutePath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INPUT_BYTES) {
    throw new LaunchExecutionPlanCliError('input_file_invalid');
  }
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
}

function main(): void {
  try {
    const web = parseWebLaunchGateDocument(readJson(WEB_GATES_PATH));
    const native = parseNativeLaunchGateDocument(readJson(NATIVE_GATES_PATH));
    const document = parseLaunchExecutionPlan(
      readJson(parseInputPath(process.argv.slice(2))),
      web,
      native,
    );
    for (const task of document.tasks) {
      for (const path of task.evidence) {
        if (!existsSync(resolve(path))) {
          throw new LaunchExecutionPlanCliError('evidence_file_missing');
        }
      }
    }
    const report = evaluateLaunchExecutionPlan(document);
    process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
    process.exitCode = 0;
  } catch (error) {
    const code = error instanceof LaunchExecutionPlanCliError
      || error instanceof LaunchExecutionPlanValidationError
      ? error.code
      : 'launch_execution_plan_check_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

main();
