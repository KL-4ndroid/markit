import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const designPath = 'docs/subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md';
const design = read(designPath);
const implementationPlan = read('docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md');
const featureMatrix = read(
  'docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md',
);
const registry = read('docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md');
const executionPack = read(
  'docs/subscription/execution-pack/08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md',
);
const testManifest = read('scripts/test-files.txt');
const planModelSource = read('lib/subscription/subscription-plans.ts');

for (const record of [
  'brand_profile',
  'product_commerce_profile',
  'market_context',
  'collaboration_readiness_snapshot',
  'public_partner_snapshot',
  'benchmark_opt_in',
]) {
  assert.ok(design.includes(record), `${record} must be defined by the S7 contract`);
  assert.ok(featureMatrix.includes(record), `${record} must be reserved in the feature matrix`);
}

for (const boundary of [
  'Status: S7 completed as planning only',
  'logical records, not physical tables',
  'no Supabase migration',
  'no runtime route',
  'no public data exposure',
  'Consent is not entitlement',
  'Publish a copy, not a private view',
  'not_granted -> granted -> withdrawn',
  'draft -> published -> withdrawn',
  'Every future serializer must use an allowlist',
  'Small or uniquely identifiable cohorts must fail closed',
]) {
  assert.ok(design.includes(boundary), `missing S7 boundary: ${boundary}`);
}

const publicExampleMatch = design.match(
  /<!-- PUBLIC_SAFE_EXAMPLE_START -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- PUBLIC_SAFE_EXAMPLE_END -->/,
);
assert.ok(publicExampleMatch, 'S7 must contain one delimited public-safe JSON example');
const publicExample = JSON.parse(publicExampleMatch[1]) as Record<string, unknown>;
const serializedPublicExample = JSON.stringify(publicExample);

for (const privateKey of [
  'cost',
  'profit',
  'margin',
  'supplier',
  'staff',
  'transaction',
  'customer',
  'inventory',
  'capacity',
  'payout',
  'bank',
  'tax',
]) {
  assert.doesNotMatch(
    serializedPublicExample,
    new RegExp(privateKey, 'i'),
    `public-safe example must omit ${privateKey}`,
  );
}

for (const approvedKey of [
  'display_name',
  'categories',
  'collaboration_modes',
  'lead_time_band',
  'contact_channel',
  'limitations',
  'published_at',
  'expires_at',
]) {
  assert.ok(serializedPublicExample.includes(approvedKey), `${approvedKey} must be demonstrated`);
}

for (const capability of [
  'strategic.collaboration_readiness',
  'strategic.public_partner_snapshot',
  'strategic.anonymous_benchmark',
]) {
  const marker = `| \`${capability}\` |`;
  assert.equal(registry.split(marker).length - 1, 1, `${capability} must have one registry row`);
  const row = registry.split(marker)[1].split('\n', 1)[0];
  assert.ok(row.includes('`model_only`'), `${capability} must remain model_only`);
}

assert.ok(
  implementationPlan.includes(
    '`docs/subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md` is the canonical S7 contract',
  ),
  'implementation plan must link the canonical S7 contract',
);
assert.ok(
  executionPack.includes('docs/subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md'),
  'execution pack must link the canonical S7 contract',
);
assert.ok(
  testManifest.includes('tsx tests/subscription-strategic-growth-data-reserve.test.ts'),
  'S7 guardrail must be in the complete test manifest',
);

for (const runtimePath of [
  'app/marketplace',
  'app/partners',
  'app/creators',
  'app/api/marketplace',
  'app/api/partners',
  'app/api/strategic-growth',
]) {
  assert.equal(existsSync(join(root, runtimePath)), false, `${runtimePath} is outside S7`);
}

assert.doesNotMatch(
  planModelSource,
  /growth_reserve|collaboration_readiness|public_partner_snapshot|anonymous_benchmark/i,
  'strategic capabilities must not enter purchasable plan definitions',
);

console.log('PASS S7 strategic growth data reserve and privacy guardrails');
