export const WEB_RELEASE_SMOKE_CHECK_IDS = [
  'production_surface',
  'pwa_resources',
  'legal_support',
  'api_boundary',
] as const;

export type WebReleaseSmokeCheckId = typeof WEB_RELEASE_SMOKE_CHECK_IDS[number];
export type WebReleaseSmokeLegalMode = 'draft' | 'published';
export type WebReleaseSmokeCheckStatus = 'passed' | 'failed' | 'not_run';

export type WebReleaseSmokeOptions = Readonly<{
  baseUrl: string;
  expectedCommitSha: string;
  legalMode: WebReleaseSmokeLegalMode;
}>;

export type WebReleaseSmokeCheck = Readonly<{
  id: WebReleaseSmokeCheckId;
  scriptPath: string;
  environment: Readonly<Record<string, string>>;
}>;

export type WebReleaseSmokeResult = Readonly<{
  id: WebReleaseSmokeCheckId;
  status: WebReleaseSmokeCheckStatus;
}>;

export type WebReleaseSmokeReport = Readonly<{
  schemaVersion: 1;
  evaluatedAt: string;
  release: WebReleaseSmokeOptions;
  ready: boolean;
  passedCount: number;
  failedCount: number;
  notRunCount: number;
  checks: readonly WebReleaseSmokeResult[];
}>;

export type WebReleaseSmokeValidationCode =
  | 'argument_invalid'
  | 'result_invalid'
  | 'timestamp_invalid';

export class WebReleaseSmokeValidationError extends Error {
  constructor(readonly code: WebReleaseSmokeValidationCode) {
    super(code);
  }
}

function requireHttpsOrigin(value: string | undefined): string {
  if (!value) throw new WebReleaseSmokeValidationError('argument_invalid');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new WebReleaseSmokeValidationError('argument_invalid');
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new WebReleaseSmokeValidationError('argument_invalid');
  }
  return parsed.origin;
}

function requireCommitSha(value: string | undefined): string {
  if (!value || !/^[0-9a-f]{7,40}$/i.test(value)) {
    throw new WebReleaseSmokeValidationError('argument_invalid');
  }
  return value.slice(0, 7).toLowerCase();
}

function requireLegalMode(value: string | undefined): WebReleaseSmokeLegalMode {
  if (value !== 'draft' && value !== 'published') {
    throw new WebReleaseSmokeValidationError('argument_invalid');
  }
  return value;
}

export function parseWebReleaseSmokeOptions(args: readonly string[]): WebReleaseSmokeOptions {
  if (args.length !== 3) throw new WebReleaseSmokeValidationError('argument_invalid');
  const values = new Map<string, string>();
  for (const argument of args) {
    const separator = argument.indexOf('=');
    if (!argument.startsWith('--') || separator <= 2) {
      throw new WebReleaseSmokeValidationError('argument_invalid');
    }
    const key = argument.slice(2, separator);
    const value = argument.slice(separator + 1).trim();
    if (!value || values.has(key)) {
      throw new WebReleaseSmokeValidationError('argument_invalid');
    }
    values.set(key, value);
  }
  if (
    values.size !== 3
    || !values.has('base-url')
    || !values.has('expected-commit')
    || !values.has('legal-mode')
  ) {
    throw new WebReleaseSmokeValidationError('argument_invalid');
  }
  return Object.freeze({
    baseUrl: requireHttpsOrigin(values.get('base-url')),
    expectedCommitSha: requireCommitSha(values.get('expected-commit')),
    legalMode: requireLegalMode(values.get('legal-mode')),
  });
}

export function buildWebReleaseSmokeChecks(
  options: WebReleaseSmokeOptions,
): readonly WebReleaseSmokeCheck[] {
  const shared = { WEB_SMOKE_EXPECTED_COMMIT_SHA: options.expectedCommitSha };
  return Object.freeze([
    Object.freeze({
      id: 'production_surface' as const,
      scriptPath: 'scripts/smoke-web-production-boundary.mjs',
      environment: Object.freeze({
        ...shared,
        WEB_PRODUCTION_BOUNDARY_BASE_URL: options.baseUrl,
      }),
    }),
    Object.freeze({
      id: 'pwa_resources' as const,
      scriptPath: 'scripts/smoke-web-pwa-resources.mjs',
      environment: Object.freeze({
        ...shared,
        WEB_PWA_SMOKE_BASE_URL: options.baseUrl,
      }),
    }),
    Object.freeze({
      id: 'legal_support' as const,
      scriptPath: 'scripts/smoke-web-public-legal.mjs',
      environment: Object.freeze({
        ...shared,
        WEB_LEGAL_SMOKE_BASE_URL: options.baseUrl,
        WEB_LEGAL_SMOKE_MODE: options.legalMode,
      }),
    }),
    Object.freeze({
      id: 'api_boundary' as const,
      scriptPath: 'scripts/smoke-vercel-api.mjs',
      environment: Object.freeze({
        ...shared,
        APP_API_SMOKE_BASE_URL: options.baseUrl,
        APP_API_SMOKE_ALLOWED_ORIGIN: 'capacitor://localhost',
        APP_API_SMOKE_DENIED_ORIGIN: 'https://not-allowed.invalid',
      }),
    }),
  ]);
}

function requireTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new WebReleaseSmokeValidationError('timestamp_invalid');
  }
  return value;
}

export function createWebReleaseSmokeReport(
  options: WebReleaseSmokeOptions,
  evaluatedAt: string,
  results: readonly WebReleaseSmokeResult[],
): WebReleaseSmokeReport {
  if (
    results.length !== WEB_RELEASE_SMOKE_CHECK_IDS.length
    || results.some((result, index) => (
      result.id !== WEB_RELEASE_SMOKE_CHECK_IDS[index]
      || !['passed', 'failed', 'not_run'].includes(result.status)
    ))
  ) {
    throw new WebReleaseSmokeValidationError('result_invalid');
  }
  const firstNonPassIndex = results.findIndex(result => result.status !== 'passed');
  if (
    firstNonPassIndex >= 0
    && (
      results[firstNonPassIndex].status !== 'failed'
      || results.slice(firstNonPassIndex + 1).some(result => result.status !== 'not_run')
    )
  ) {
    throw new WebReleaseSmokeValidationError('result_invalid');
  }
  const checks = results.map(result => Object.freeze({ ...result }));
  const passedCount = checks.filter(result => result.status === 'passed').length;
  const failedCount = checks.filter(result => result.status === 'failed').length;
  const notRunCount = checks.filter(result => result.status === 'not_run').length;
  return Object.freeze({
    schemaVersion: 1,
    evaluatedAt: requireTimestamp(evaluatedAt),
    release: Object.freeze({ ...options }),
    ready: passedCount === checks.length,
    passedCount,
    failedCount,
    notRunCount,
    checks: Object.freeze(checks),
  });
}
