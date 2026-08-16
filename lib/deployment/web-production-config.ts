import { resolvePublicLegalSupportConfig } from '../legal/public-legal-support-config';

export type WebProductionConfigEnv = Record<string, string | undefined>;

export type WebProductionConfigCheck = {
  id: string;
  passed: boolean;
  message: string;
};

export type WebProductionConfigReport = {
  ready: boolean;
  passedCount: number;
  failedCount: number;
  checks: readonly WebProductionConfigCheck[];
};

export type WebBuildMetadata = {
  version: string;
  commitSha: string;
  buildTime: string;
};

export type ResolveWebBuildMetadataInput = {
  env: WebProductionConfigEnv;
  packageVersion?: string;
  gitCommitSha?: string;
  nowMs?: number;
};

export type ValidatePaidWebProductionConfigOptions = {
  buildMetadata?: WebBuildMetadata;
};

const PLACEHOLDER_PATTERN = /(?:your[-_]|example|placeholder|change[-_]?me)/i;
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

const SALES_ROUTE_FLAGS = [
  'SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED',
  'SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION',
  'SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED',
  'SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION',
  'SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED',
  'SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION',
  'SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ENABLED',
  'SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ALLOW_PRODUCTION',
] as const;

const FAULT_INJECTION_SCOPE_KEYS = [
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_AUTOMATIC_MODE',
] as const;

function value(env: WebProductionConfigEnv, name: string): string {
  return env[name]?.trim() ?? '';
}

export function resolveWebBuildMetadata(
  input: ResolveWebBuildMetadataInput,
): WebBuildMetadata {
  const explicitVersion = value(input.env, 'NEXT_PUBLIC_APP_VERSION');
  const explicitCommitSha = value(input.env, 'NEXT_PUBLIC_APP_COMMIT_SHA');
  const vercelCommitSha = value(input.env, 'VERCEL_GIT_COMMIT_SHA');
  const explicitBuildTime = value(input.env, 'NEXT_PUBLIC_APP_BUILD_TIME');
  const nowMs = input.nowMs ?? Date.now();

  return {
    version: explicitVersion || input.packageVersion?.trim() || '',
    commitSha: explicitCommitSha
      || (vercelCommitSha ? vercelCommitSha.slice(0, 7) : '')
      || input.gitCommitSha?.trim()
      || '',
    buildTime: explicitBuildTime
      || (Number.isFinite(nowMs) ? new Date(nowMs).toISOString() : ''),
  };
}

function isPresentNonPlaceholder(input: string, minimumLength = 1): boolean {
  return input.length >= minimumLength
    && !PLACEHOLDER_PATTERN.test(input)
    && !/\s/.test(input);
}

function isAbsoluteHttpsUrl(input: string, originOnly: boolean): boolean {
  if (!input) return false;
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'https:'
      && parsed.username === ''
      && parsed.password === ''
      && parsed.search === ''
      && parsed.hash === ''
      && (!originOnly || parsed.pathname === '/');
  } catch {
    return false;
  }
}

function hasValidCorsOrigins(input: string): boolean {
  if (!input) return false;
  const entries = input.split(',').map(entry => entry.trim());
  if (entries.some(entry => !entry || entry === '*' || entry.toLowerCase() === 'null')) {
    return false;
  }

  let hasHttpsOrigin = false;
  for (const entry of entries) {
    if (entry === 'capacitor://localhost') continue;
    if (!isAbsoluteHttpsUrl(entry, true)) return false;
    hasHttpsOrigin = true;
  }
  return hasHttpsOrigin;
}

function check(id: string, passed: boolean, passMessage: string, failMessage: string): WebProductionConfigCheck {
  return {
    id,
    passed,
    message: passed ? passMessage : failMessage,
  };
}

function allEqual(env: WebProductionConfigEnv, names: readonly string[], expected: string): boolean {
  return names.every(name => value(env, name) === expected);
}

function hasPublicSecret(env: WebProductionConfigEnv): boolean {
  return Object.entries(env).some(([name, rawValue]) => (
    name.startsWith('NEXT_PUBLIC_')
    && Boolean(rawValue?.trim())
    && /(?:SECRET|SERVICE_ROLE|ACCESS_KEY|CRON_SECRET|FAULT_INJECTION_TOKEN)/i.test(name)
  ));
}

export function validatePaidWebProductionConfig(
  env: WebProductionConfigEnv,
  options: ValidatePaidWebProductionConfigOptions = {},
): WebProductionConfigReport {
  const supabaseUrl = value(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = value(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serverSecret = value(env, 'SUPABASE_SECRET_KEY');
  const apiBaseUrl = value(env, 'NEXT_PUBLIC_API_BASE_URL');
  const buildMetadata = options.buildMetadata ?? resolveWebBuildMetadata({
    env,
    nowMs: Number.NaN,
  });
  const accountByteLimit = Number(value(env, 'PRODUCT_COVER_PHOTO_MAX_ACCOUNT_BYTES'));
  const legalSupportConfig = resolvePublicLegalSupportConfig(env);

  const checks: WebProductionConfigCheck[] = [
    check(
      'supabase_public_url',
      isAbsoluteHttpsUrl(supabaseUrl, true) && !PLACEHOLDER_PATTERN.test(supabaseUrl),
      'Supabase public URL is a non-placeholder HTTPS origin.',
      'Set a non-placeholder HTTPS Supabase origin without credentials, path, query, or fragment.',
    ),
    check(
      'supabase_anon_key',
      isPresentNonPlaceholder(anonKey, 20),
      'Supabase browser key is present and non-placeholder.',
      'Set the browser-compatible Supabase anon key required by the current Web client.',
    ),
    check(
      'supabase_server_secret',
      serverSecret.length >= 32
        && serverSecret.length <= 1_024
        && serverSecret.startsWith('sb_secret_')
        && !/\s/.test(serverSecret)
        && !PLACEHOLDER_PATTERN.test(serverSecret),
      'Dedicated Supabase server secret matches the bounded key contract.',
      'Set a dedicated bounded sb_secret_ key for server-only repositories.',
    ),
    check(
      'legacy_service_role_absent',
      value(env, 'SUPABASE_SERVICE_ROLE_KEY') === '',
      'Legacy service-role fallback is absent.',
      'Remove the legacy service-role key and use the dedicated SUPABASE_SECRET_KEY contract.',
    ),
    check(
      'cors_allowlist',
      hasValidCorsOrigins(value(env, 'APP_API_CORS_ALLOWED_ORIGINS')),
      'CORS allowlist contains at least one exact HTTPS origin and no wildcard.',
      'Set exact production HTTPS origins; wildcard, null, credentials, path, query, and fragment are forbidden.',
    ),
    check(
      'production_app_environment',
      value(env, 'NEXT_PUBLIC_APP_ENV') === 'production',
      'Public app environment is production.',
      'Set NEXT_PUBLIC_APP_ENV=production for the production client build.',
    ),
    check(
      'optional_api_base_url',
      apiBaseUrl === '' || isAbsoluteHttpsUrl(apiBaseUrl, false),
      'Optional API base URL is absent or valid HTTPS.',
      'Remove the Web API base override or set a stable HTTPS URL without credentials, query, or fragment.',
    ),
    check(
      'release_metadata',
      isPresentNonPlaceholder(buildMetadata.version)
        && buildMetadata.version !== 'development'
        && SHA_PATTERN.test(buildMetadata.commitSha)
        && buildMetadata.buildTime !== ''
        && Number.isFinite(Date.parse(buildMetadata.buildTime)),
      'Version, commit SHA, and build time resolve from the build contract.',
      'Provide valid metadata overrides or preserve package, Vercel/Git SHA, and build-time fallbacks.',
    ),
    check(
      'public_support_contact',
      legalSupportConfig.supportContactReady,
      'Public support email passes the bounded contact contract.',
      'Set one real public support mailbox without display-name, mailto, query, whitespace, or placeholder syntax.',
    ),
    check(
      'public_operator_identity',
      legalSupportConfig.operatorIdentityReady,
      'Public service operator name, representative, and business address are present.',
      'Set the reviewed public operator name, representative, and business address required for launch disclosure.',
    ),
    check(
      'legal_policy_publication',
      legalSupportConfig.policyPublicationReady,
      'Legal policies have a public effective date and a server-only approval date.',
      'Set the public effective date and server-only legal approval date after product and legal review.',
    ),
    check(
      'development_surfaces_disabled',
      value(env, 'NEXT_PUBLIC_DEBUG_MODE') === 'false'
        && value(env, 'SALES_PHOTO_EVIDENCE_TEST_PAGE_ENABLED') === '0'
        && value(env, 'INTERNAL_TEST_SURFACES_ENABLED') === '0'
        && value(env, 'SUBSCRIPTION_SIMULATION_ENABLED') !== 'true',
      'Debug, test-page, and subscription simulation controls are disabled.',
      'Disable every debug/test surface and subscription simulation in production.',
    ),
    check(
      'fault_injection_cleared',
      value(env, 'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED') === '0'
        && value(env, 'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION') === '0'
        && FAULT_INJECTION_SCOPE_KEYS.every(name => value(env, name) === ''),
      'Fault injection is disabled and all temporary scope values are cleared.',
      'Disable fault injection and remove every token, actor, market, sale, and automatic-mode value.',
    ),
    check(
      'sales_client_runtime_gate',
      value(env, 'NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ENABLED') === '1'
        && value(env, 'NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ALLOW_PRODUCTION') === '1',
      'Sales-evidence client runtime is explicitly enabled for production.',
      'Enable both sales-evidence client runtime flags only after staging evidence is approved.',
    ),
    check(
      'sales_server_route_gates',
      allEqual(env, SALES_ROUTE_FLAGS, '1'),
      'Sales-evidence server routes and production allow gates are enabled.',
      'Every sales-evidence server route requires both its enabled and production-allow gate.',
    ),
    check(
      'expiration_cron',
      value(env, 'SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ENABLED') === '1'
        && value(env, 'SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ALLOW_PRODUCTION') === '1'
        && isPresentNonPlaceholder(value(env, 'CRON_SECRET'), 32)
        && value(env, 'CRON_SECRET').length <= 1_024,
      'Expiration route and bounded cron authorization are configured.',
      'Enable both expiration gates and set a trimmed 32-1024 character server-only cron secret.',
    ),
    check(
      'r2_private_storage',
      isPresentNonPlaceholder(value(env, 'R2_ACCOUNT_ID'), 8)
        && isPresentNonPlaceholder(value(env, 'R2_ACCESS_KEY_ID'), 8)
        && isPresentNonPlaceholder(value(env, 'R2_SECRET_ACCESS_KEY'), 16)
        && BUCKET_PATTERN.test(value(env, 'R2_BUCKET_NAME'))
        && !PLACEHOLDER_PATTERN.test(value(env, 'R2_BUCKET_NAME'))
        && (
          value(env, 'R2_ENDPOINT') === ''
          || isAbsoluteHttpsUrl(value(env, 'R2_ENDPOINT'), true)
        ),
      'Private R2 credentials, bucket, and optional endpoint pass structural validation.',
      'Set non-placeholder private R2 values and an optional HTTPS origin endpoint.',
    ),
    check(
      'product_cover_runtime_gates',
      value(env, 'PRODUCT_COVER_PHOTO_READ_ENABLED') === '1'
        && value(env, 'PRODUCT_COVER_PHOTO_READ_ALLOW_PRODUCTION') === '1'
        && value(env, 'PRODUCT_COVER_PHOTO_UPLOAD_ENABLED') === '1'
        && value(env, 'PRODUCT_COVER_PHOTO_UPLOAD_ALLOW_PRODUCTION') === '1'
        && value(env, 'PRODUCT_COVER_PHOTO_DELETE_ENABLED') === '1',
      'Product-cover read, upload, delete, and production allow gates are enabled.',
      'Enable the complete product-cover route set only after its production smoke is approved.',
    ),
    check(
      'product_cover_paid_entitlement',
      value(env, 'PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE') === 'required',
      'Product-cover writes require paid entitlement for the paid launch.',
      'Set PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=required before the paid subscription launch.',
    ),
    check(
      'product_cover_quota',
      Number.isSafeInteger(accountByteLimit) && accountByteLimit >= 750_000,
      'Product-cover account quota is an explicit safe integer.',
      'Set an integer product-cover account byte limit of at least 750000.',
    ),
    check(
      'public_secret_boundary',
      !hasPublicSecret(env),
      'No populated secret-like environment name uses the NEXT_PUBLIC_ prefix.',
      'Remove secret, service-role, access-key, cron, and fault-token values from public variables.',
    ),
  ];

  const passedCount = checks.filter(item => item.passed).length;
  return {
    ready: passedCount === checks.length,
    passedCount,
    failedCount: checks.length - passedCount,
    checks,
  };
}

export function formatWebProductionConfigReport(report: WebProductionConfigReport): string {
  const lines = [
    `BoothBook paid Web production config: ${report.ready ? 'READY' : 'NOT READY'}`,
    `Checks: ${report.passedCount} passed, ${report.failedCount} failed`,
  ];
  for (const item of report.checks) {
    lines.push(`[${item.passed ? 'PASS' : 'FAIL'}] ${item.id}: ${item.message}`);
  }
  lines.push('No environment values were printed.');
  return lines.join('\n');
}
