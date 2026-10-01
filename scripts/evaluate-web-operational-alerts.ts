import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateOperationalAlertPolicy,
  type OperationalAlertEvent,
  type OperationalAlertPolicyInput,
  type OperationalHealthProbe,
} from '../lib/observability/operational-alert-policy';

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_EVENTS = 10_000;
const MAX_HEALTH_PROBES = 1_000;

class OperationalAlertCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 160) {
    throw new OperationalAlertCliError('input_invalid');
  }
  return value;
}

function parseMetric(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
    || value > 1_000_000_000
  ) {
    throw new OperationalAlertCliError('input_invalid');
  }
  return value;
}

function parseEvent(value: unknown): OperationalAlertEvent {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new OperationalAlertCliError('input_invalid');
  }
  const outcome = value.outcome;
  if (outcome !== 'success' && outcome !== 'partial' && outcome !== 'failure') {
    throw new OperationalAlertCliError('input_invalid');
  }

  let metrics: OperationalAlertEvent['metrics'];
  if (value.metrics !== undefined) {
    if (!isRecord(value.metrics)) throw new OperationalAlertCliError('input_invalid');
    const attemptedCount = parseMetric(value.metrics.attemptedCount);
    const failedCount = parseMetric(value.metrics.failedCount);
    metrics = {
      ...(attemptedCount === undefined ? {} : { attemptedCount }),
      ...(failedCount === undefined ? {} : { failedCount }),
    };
  }

  return {
    schemaVersion: 1,
    timestamp: requireString(value.timestamp),
    event: requireString(value.event),
    outcome,
    ...(metrics === undefined ? {} : { metrics }),
  };
}

function parseHealthProbe(value: unknown): OperationalHealthProbe {
  if (
    !isRecord(value)
    || typeof value.healthy !== 'boolean'
    || typeof value.releaseMatches !== 'boolean'
  ) {
    throw new OperationalAlertCliError('input_invalid');
  }
  return {
    timestamp: requireString(value.timestamp),
    healthy: value.healthy,
    releaseMatches: value.releaseMatches,
  };
}

function parseInput(value: unknown): OperationalAlertPolicyInput {
  if (!isRecord(value) || !Array.isArray(value.events) || !Array.isArray(value.healthProbes)) {
    throw new OperationalAlertCliError('input_invalid');
  }
  if (value.events.length > MAX_EVENTS || value.healthProbes.length > MAX_HEALTH_PROBES) {
    throw new OperationalAlertCliError('input_too_large');
  }
  return {
    now: requireString(value.now),
    observationStartedAt: requireString(value.observationStartedAt),
    events: value.events.map(parseEvent),
    healthProbes: value.healthProbes.map(parseHealthProbe),
  };
}

function readInputPath(argv: readonly string[]): string {
  const inline = argv.find(argument => argument.startsWith('--input='));
  if (inline) return inline.slice('--input='.length);
  const inputIndex = argv.indexOf('--input');
  if (inputIndex >= 0 && argv[inputIndex + 1]) return argv[inputIndex + 1];
  throw new OperationalAlertCliError('input_path_required');
}

function main(): void {
  try {
    const inputPath = resolve(readInputPath(process.argv.slice(2)));
    const stat = statSync(inputPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INPUT_BYTES) {
      throw new OperationalAlertCliError('input_file_invalid');
    }
    const input = parseInput(JSON.parse(readFileSync(inputPath, 'utf8')) as unknown);
    const snapshot = evaluateOperationalAlertPolicy(input);
    process.stdout.write(`${JSON.stringify({ ok: true, snapshot })}\n`);
    process.exitCode = snapshot.status === 'release_blocker'
      ? 2
      : snapshot.status === 'warning'
        ? 1
        : 0;
  } catch (error) {
    const code = error instanceof OperationalAlertCliError
      ? error.code
      : 'evaluation_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 64;
  }
}

main();
