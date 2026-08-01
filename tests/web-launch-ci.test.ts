import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workflowPath = '.github/workflows/lint.yml';
const readinessPath = 'docs/WEB_LAUNCH_READINESS_2026_07_30.md';

for (const path of [workflowPath, readinessPath]) {
  assert.ok(existsSync(join(root, path)), `${path} must exist`);
}

const workflow = readFileSync(join(root, workflowPath), 'utf8');
const readiness = readFileSync(join(root, readinessPath), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const nvmVersion = readFileSync(join(root, '.nvmrc'), 'utf8').trim();

for (const requiredWorkflowContract of [
  'name: Web launch quality gates',
  'pull_request:',
  'branches: [main]',
  'workflow_dispatch:',
  'permissions:',
  'contents: read',
  'cancel-in-progress: true',
  'web-quality:',
  'timeout-minutes: 25',
  'npm ci --no-audit --no-fund',
  'npm run lint',
  'npm test',
  'npm run build',
  'git diff --check',
  'git diff --exit-code',
]) {
  assert.ok(
    workflow.includes(requiredWorkflowContract),
    `missing Web CI contract: ${requiredWorkflowContract}`,
  );
}

assert.doesNotMatch(workflow, /^\s+paths(?:-ignore)?:/m, 'all repository changes must run CI');
assert.doesNotMatch(workflow, /continue-on-error:\s*true/i);
assert.doesNotMatch(workflow, /SUBSCRIPTION_SIMULATION_ENABLED|SUPABASE_SECRET_KEY|R2_SECRET_ACCESS_KEY/);
assert.doesNotMatch(workflow, /secrets\./, 'quality gates must not require deployment secrets');
assert.equal(
  workflow.match(/node-version: '24'/g)?.length,
  2,
  'every Web CI job must run on Node 24 LTS',
);
assert.doesNotMatch(workflow, /node-version: '20'/);
assert.equal(packageJson.engines?.node, '24.x');
assert.equal(nvmVersion, '24');

for (const readinessBoundary of [
  'Overall status: `NOT_READY`',
  '`DB-066`',
  '`TEAM-LIVE`',
  '`PROD-CONFIG`',
  '`STAGING-E2E`',
  '`BILLING-MERCHANT`',
  '`F3B-F3E`',
  '`S9`',
  '`PROMOTION-RUNTIME`',
  'Local success is not production evidence',
]) {
  assert.ok(readiness.includes(readinessBoundary), `missing launch boundary: ${readinessBoundary}`);
}

assert.ok(
  manifest.includes('tsx tests/web-launch-ci.test.ts'),
  'Web launch CI guardrail must be part of the complete test manifest',
);

console.log('PASS Web launch CI and readiness evidence boundaries');
