import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const registry = readFileSync(
  join(root, 'docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md'),
  'utf8',
);

const sectionStart = registry.indexOf('## S3 Paid-Looking Capability Mapping');
const sectionEnd = registry.indexOf('## Independent Gate Order Observed Today');
assert.ok(sectionStart >= 0, 'S3 mapping section must exist');
assert.ok(sectionEnd > sectionStart, 'S3 mapping section must end before the observed gate-order audit');

const mapping = registry.slice(sectionStart, sectionEnd);
for (const heading of [
  'Capability ID',
  'Plan feature',
  'Product tier rule',
  'Current UI source',
  'Current runtime source',
  'Server enforcement today',
  'Role requirement',
  'Data requirement',
  'Current class and production status',
  'Canonical downgrade rule',
]) {
  assert.match(mapping, new RegExp(`\\b${heading.replaceAll(' ', '\\s+')}\\b`), heading);
}

for (const capabilityId of [
  'analytics.single_market.basic',
  'analytics.rejoin.simple',
  'analytics.market_comparison',
  'analytics.product_ranking.basic',
  'analytics.product_recommendations',
  'analytics.trend.recent3',
  'analytics.trend.recent10',
  'analytics.trend.all',
  'report.settlement.preview',
  'report.pdf.generate',
  'report.excel.generate',
  'photo.product_cover.upload',
  'photo.sales_evidence.upload',
  'team.staff_collaboration',
  'team.manager_workflow',
  'team.owner_financial_report',
]) {
  const rowMarker = `| \`${capabilityId}\` |`;
  assert.equal(mapping.split(rowMarker).length - 1, 1, `${capabilityId} must have one S3 mapping row`);
}

for (const requiredRule of [
  'single-market analysis and simple rejoin rows to `basicAnalytics`',
  'data-completeness gates remain separate',
  'separate Team capabilities',
  'returns `open_access` in pre-subscription open mode',
  'rollout controls, not Team entitlement',
  'No current paid-only server route accepts a plan',
  'does not turn any `server_required` launch target into active server enforcement',
]) {
  assert.ok(mapping.includes(requiredRule), requiredRule);
}

const clientPlanGrantPattern = /localStorage|getItem\(['"]plan|sessionStorage|NEXT_PUBLIC_(?:ACCOUNT_)?(?:PLAN|TIER)|searchParams\.get\(['"](?:plan|tier)|headers\.get\(['"]x-(?:account-)?(?:plan|tier)/i;
for (const routePath of [
  'app/api/product-cover-photo/upload/route.ts',
  'app/api/sales-photo-evidence/upload/route.ts',
]) {
  const source = readFileSync(join(root, routePath), 'utf8');
  assert.doesNotMatch(source, clientPlanGrantPattern, routePath);
  assert.doesNotMatch(source, /subscription-(?:capabilities|access)/, `${routePath} must remain unchanged in S3`);
}

console.log('PASS S3 subscription feature-gate mapping audit');
