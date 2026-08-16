import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  formatWebProductionConfigReport,
  resolveWebBuildMetadata,
  validatePaidWebProductionConfig,
  type WebProductionConfigEnv,
} from '../lib/deployment/web-production-config';

const validEnv: WebProductionConfigEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://boothbook.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: `anon_${'a'.repeat(32)}`,
  SUPABASE_SECRET_KEY: `sb_secret_${'s'.repeat(40)}`,
  APP_API_CORS_ALLOWED_ORIGINS: 'https://app.boothbook.tw,capacitor://localhost',
  NEXT_PUBLIC_APP_ENV: 'production',
  NEXT_PUBLIC_DEBUG_MODE: 'false',
  NEXT_PUBLIC_APP_VERSION: '1.0.0',
  NEXT_PUBLIC_APP_COMMIT_SHA: 'a1b2c3d4e5f6a7b8c9d0',
  NEXT_PUBLIC_APP_BUILD_TIME: '2026-07-30T12:00:00.000Z',
  NEXT_PUBLIC_SUPPORT_EMAIL: 'support@boothbook.tw',
  NEXT_PUBLIC_SERVICE_OPERATOR_NAME: 'BoothBook Studio Co., Ltd.',
  NEXT_PUBLIC_SERVICE_OPERATOR_REPRESENTATIVE: 'Launch Reviewer',
  NEXT_PUBLIC_SERVICE_OPERATOR_ADDRESS: '1 Market Road, Taipei City, Taiwan',
  NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE: '2026-08-01',
  LEGAL_POLICY_APPROVED_DATE: '2026-07-31',
  INTERNAL_TEST_SURFACES_ENABLED: '0',
  SUBSCRIPTION_SIMULATION_ENABLED: '0',
  SALES_PHOTO_EVIDENCE_TEST_PAGE_ENABLED: '0',
  NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ENABLED: '1',
  NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ALLOW_PRODUCTION: '1',
  SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED: '1',
  SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION: '1',
  SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED: '1',
  SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION: '1',
  SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED: '1',
  SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION: '1',
  SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ENABLED: '1',
  SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ALLOW_PRODUCTION: '1',
  SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ENABLED: '1',
  SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ALLOW_PRODUCTION: '1',
  CRON_SECRET: 'c'.repeat(40),
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED: '0',
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION: '0',
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN: '',
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID: '',
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID: '',
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID: '',
  SALES_PHOTO_EVIDENCE_FAULT_INJECTION_AUTOMATIC_MODE: '',
  R2_ACCOUNT_ID: '1234567890abcdef1234567890abcdef',
  R2_ACCESS_KEY_ID: 'r2-access-key',
  R2_SECRET_ACCESS_KEY: 'r2-secret-access-key-value',
  R2_BUCKET_NAME: 'boothbook-private-production',
  PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE: 'required',
  PRODUCT_COVER_PHOTO_READ_ENABLED: '1',
  PRODUCT_COVER_PHOTO_READ_ALLOW_PRODUCTION: '1',
  PRODUCT_COVER_PHOTO_UPLOAD_ENABLED: '1',
  PRODUCT_COVER_PHOTO_UPLOAD_ALLOW_PRODUCTION: '1',
  PRODUCT_COVER_PHOTO_DELETE_ENABLED: '1',
  PRODUCT_COVER_PHOTO_MAX_ACCOUNT_BYTES: '25000000',
};

function withChanges(changes: WebProductionConfigEnv): WebProductionConfigEnv {
  return { ...validEnv, ...changes };
}

function failedIds(env: WebProductionConfigEnv): string[] {
  return validatePaidWebProductionConfig(env).checks
    .filter(check => !check.passed)
    .map(check => check.id);
}

const validReport = validatePaidWebProductionConfig(validEnv);
assert.equal(validReport.ready, true);
assert.equal(validReport.failedCount, 0);
assert.equal(validReport.passedCount, validReport.checks.length);

assert.deepEqual(
  resolveWebBuildMetadata({
    env: {},
    packageVersion: '0.1.0',
    gitCommitSha: 'a1b2c3d',
    nowMs: Date.parse('2026-07-30T12:00:00.000Z'),
  }),
  {
    version: '0.1.0',
    commitSha: 'a1b2c3d',
    buildTime: '2026-07-30T12:00:00.000Z',
  },
);
assert.deepEqual(
  resolveWebBuildMetadata({
    env: {
      NEXT_PUBLIC_APP_VERSION: '2.0.0',
      NEXT_PUBLIC_APP_COMMIT_SHA: 'fedcba9876543210',
      NEXT_PUBLIC_APP_BUILD_TIME: '2026-07-31T01:02:03.000Z',
      VERCEL_GIT_COMMIT_SHA: '1111111111111111111111111111111111111111',
    },
    packageVersion: '0.1.0',
    gitCommitSha: 'a1b2c3d',
    nowMs: 0,
  }),
  {
    version: '2.0.0',
    commitSha: 'fedcba9876543210',
    buildTime: '2026-07-31T01:02:03.000Z',
  },
);
assert.equal(
  resolveWebBuildMetadata({
    env: { VERCEL_GIT_COMMIT_SHA: '1234567890abcdef' },
    packageVersion: '0.1.0',
    gitCommitSha: 'a1b2c3d',
    nowMs: 0,
  }).commitSha,
  '1234567',
);

const fallbackMetadata = resolveWebBuildMetadata({
  env: {},
  packageVersion: '0.1.0',
  gitCommitSha: 'a1b2c3d',
  nowMs: Date.parse('2026-07-30T12:00:00.000Z'),
});
assert.equal(
  validatePaidWebProductionConfig(
    withChanges({
      NEXT_PUBLIC_APP_VERSION: undefined,
      NEXT_PUBLIC_APP_COMMIT_SHA: undefined,
      NEXT_PUBLIC_APP_BUILD_TIME: undefined,
    }),
    { buildMetadata: fallbackMetadata },
  ).ready,
  true,
);
assert.ok(
  validatePaidWebProductionConfig(validEnv, {
    buildMetadata: { version: '', commitSha: '', buildTime: '' },
  }).checks.some(check => check.id === 'release_metadata' && !check.passed),
);

assert.ok(failedIds(withChanges({ SUPABASE_SECRET_KEY: '' })).includes('supabase_server_secret'));
assert.ok(
  failedIds(withChanges({ SUPABASE_SERVICE_ROLE_KEY: 'legacy-secret' }))
    .includes('legacy_service_role_absent'),
);
assert.ok(
  failedIds(withChanges({ APP_API_CORS_ALLOWED_ORIGINS: '*' })).includes('cors_allowlist'),
);
assert.ok(
  failedIds(withChanges({ NEXT_PUBLIC_APP_COMMIT_SHA: 'development' })).includes('release_metadata'),
);
assert.ok(
  failedIds(withChanges({ NEXT_PUBLIC_SUPPORT_EMAIL: 'mailto:support@boothbook.tw' }))
    .includes('public_support_contact'),
);
assert.ok(
  failedIds(withChanges({ NEXT_PUBLIC_SERVICE_OPERATOR_ADDRESS: 'your-business-address' }))
    .includes('public_operator_identity'),
);
assert.ok(
  failedIds(withChanges({ LEGAL_POLICY_APPROVED_DATE: '2026-02-30' }))
    .includes('legal_policy_publication'),
);
assert.ok(
  failedIds(withChanges({ SUBSCRIPTION_SIMULATION_ENABLED: 'true' }))
    .includes('development_surfaces_disabled'),
);
assert.ok(
  failedIds(withChanges({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN: 'leftover-token' }))
    .includes('fault_injection_cleared'),
);
assert.ok(
  failedIds(withChanges({ SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION: '0' }))
    .includes('sales_server_route_gates'),
);
assert.ok(
  failedIds(withChanges({ PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE: 'open' }))
    .includes('product_cover_paid_entitlement'),
);
assert.ok(
  failedIds(withChanges({ NEXT_PUBLIC_R2_SECRET_ACCESS_KEY: 'public-leak' }))
    .includes('public_secret_boundary'),
);

const formatted = formatWebProductionConfigReport(validatePaidWebProductionConfig(withChanges({
  SUPABASE_SECRET_KEY: 'sensitive-value-must-not-appear',
  CRON_SECRET: 'another-sensitive-value-must-not-appear',
})));
assert.doesNotMatch(formatted, /sensitive-value-must-not-appear/);
assert.doesNotMatch(formatted, /another-sensitive-value-must-not-appear/);
assert.match(formatted, /No environment values were printed\./);

const root = process.cwd();
const envExample = readFileSync(join(root, '.env.example'), 'utf8');
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
const nextConfig = readFileSync(join(root, 'next.config.mjs'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const runbook = readFileSync(join(root, 'docs/WEB_PRODUCTION_CONFIG_CHECK.md'), 'utf8');

for (const requiredExampleContract of [
  'NEXT_PUBLIC_APP_VERSION=',
  'NEXT_PUBLIC_APP_BUILD_TIME=',
  'NEXT_PUBLIC_APP_COMMIT_SHA=',
  'NEXT_PUBLIC_SUPPORT_EMAIL=',
  'NEXT_PUBLIC_SERVICE_OPERATOR_NAME=',
  'NEXT_PUBLIC_SERVICE_OPERATOR_REPRESENTATIVE=',
  'NEXT_PUBLIC_SERVICE_OPERATOR_ADDRESS=',
  'NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE=',
  'LEGAL_POLICY_APPROVED_DATE=',
  'INTERNAL_TEST_SURFACES_ENABLED=0',
  'SUBSCRIPTION_SIMULATION_ENABLED=0',
  'SUPABASE_SECRET_KEY=',
  'PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open',
]) {
  assert.ok(envExample.includes(requiredExampleContract), `missing env example: ${requiredExampleContract}`);
}

assert.ok(packageJson.includes('"check:production-config"'));
assert.ok(nextConfig.includes('process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version'));
assert.ok(nextConfig.includes('process.env.VERCEL_GIT_COMMIT_SHA'));
assert.ok(nextConfig.includes('new Date().toISOString()'));
assert.ok(manifest.includes('tsx tests/web-production-config.test.ts'));
assert.match(runbook, /never prints\s+environment values/);
assert.match(runbook, /does not connect to Supabase, R2, Vercel, or a billing provider/);
assert.ok(runbook.includes('PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=required'));
assert.ok(runbook.includes('LEGAL_POLICY_APPROVED_DATE'));
assert.ok(runbook.includes('WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md'));

console.log('PASS paid Web production configuration preflight');
