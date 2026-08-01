import 'server-only';

export type ServerOperationalEventLevel = 'info' | 'warn' | 'error';
export type ServerOperationalEventOutcome = 'success' | 'partial' | 'failure';
export type ServerOperationalMetricName =
  | 'attemptedCount'
  | 'completedCount'
  | 'failedCount'
  | 'imageBytes'
  | 'invalidBindingCount'
  | 'scannedCount'
  | 'thumbnailBytes';

export type ServerOperationalEventInput = Readonly<{
  level: ServerOperationalEventLevel;
  event: string;
  outcome: ServerOperationalEventOutcome;
  code: string;
  route: string;
  durationMs?: number;
  errorName?: string;
  metrics?: Partial<Record<ServerOperationalMetricName, number>>;
}>;

export type ServerOperationalEventRecord = Readonly<{
  schemaVersion: 1;
  timestamp: string;
  level: ServerOperationalEventLevel;
  event: string;
  outcome: ServerOperationalEventOutcome;
  code: string;
  route: string;
  durationMs?: number;
  errorName?: string;
  metrics?: Partial<Record<ServerOperationalMetricName, number>>;
  releaseCommitSha?: string;
}>;

const SAFE_TOKEN_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,95}$/;
const SAFE_ROUTE_PATTERN = /^\/api\/[a-z0-9][a-z0-9/_-]{0,159}$/;
const SAFE_ERROR_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const RELEASE_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const MAX_DURATION_MS = 15 * 60 * 1_000;
const MAX_METRIC_VALUE = 1_000_000_000;

const METRIC_NAMES: readonly ServerOperationalMetricName[] = [
  'attemptedCount',
  'completedCount',
  'failedCount',
  'imageBytes',
  'invalidBindingCount',
  'scannedCount',
  'thumbnailBytes',
];

function normalizeToken(value: string, fallback: string): string {
  return SAFE_TOKEN_PATTERN.test(value) ? value : fallback;
}

function normalizeRoute(value: string): string {
  return SAFE_ROUTE_PATTERN.test(value) ? value : '/api/unknown';
}

function normalizeBoundedInteger(value: number, maximum: number): number | undefined {
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.min(Math.round(value), maximum);
}

function normalizeMetrics(
  metrics: ServerOperationalEventInput['metrics']
): ServerOperationalEventRecord['metrics'] {
  if (!metrics) return undefined;

  const normalized: Partial<Record<ServerOperationalMetricName, number>> = {};
  for (const name of METRIC_NAMES) {
    const value = metrics[name];
    if (value === undefined) continue;
    const safeValue = normalizeBoundedInteger(value, MAX_METRIC_VALUE);
    if (safeValue !== undefined) normalized[name] = safeValue;
  }

  return Object.keys(normalized).length > 0 ? Object.freeze(normalized) : undefined;
}

export function getSafeOperationalErrorName(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  return SAFE_ERROR_NAME_PATTERN.test(error.name) ? error.name : 'UnknownError';
}

export function createServerOperationalEventRecord(
  input: ServerOperationalEventInput,
  options: Readonly<{
    now?: Date;
    releaseCommitSha?: string;
  }> = {}
): ServerOperationalEventRecord {
  const durationMs = input.durationMs === undefined
    ? undefined
    : normalizeBoundedInteger(input.durationMs, MAX_DURATION_MS);
  const errorName = input.errorName && SAFE_ERROR_NAME_PATTERN.test(input.errorName)
    ? input.errorName
    : undefined;
  const releaseCommitSha = options.releaseCommitSha
    ?? process.env.VERCEL_GIT_COMMIT_SHA;
  const metrics = normalizeMetrics(input.metrics);

  return Object.freeze({
    schemaVersion: 1,
    timestamp: (options.now ?? new Date()).toISOString(),
    level: input.level,
    event: normalizeToken(input.event, 'observability.invalid_event'),
    outcome: input.outcome,
    code: normalizeToken(input.code, 'invalid_code'),
    route: normalizeRoute(input.route),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(errorName === undefined ? {} : { errorName }),
    ...(metrics === undefined ? {} : { metrics }),
    ...(releaseCommitSha && RELEASE_SHA_PATTERN.test(releaseCommitSha)
      ? { releaseCommitSha: releaseCommitSha.toLowerCase() }
      : {}),
  });
}

export function recordServerOperationalEvent(input: ServerOperationalEventInput): void {
  try {
    const record = createServerOperationalEventRecord(input);
    const serialized = JSON.stringify(record);
    if (record.level === 'error') {
      console.error(serialized);
      return;
    }
    if (record.level === 'warn') {
      console.warn(serialized);
      return;
    }
    console.info(serialized);
  } catch {
    // Observability must never change the route outcome.
  }
}
