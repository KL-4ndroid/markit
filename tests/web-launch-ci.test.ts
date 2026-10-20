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
  workflow.match(/uses: actions\/setup-node@/g)?.length,
  'every Node CI setup must select Node 24 LTS',
);
const windowsMobileJob = workflow.split(/^  windows-mobile:/m)[1]?.split(/^  [a-z]/m)[0];
assert.ok(windowsMobileJob, 'Windows mobile checks must remain in CI');
for (const contract of [
  'runs-on: windows-latest',
  'shell: pwsh',
  'https://mobile-api.invalid',
  'npm.cmd run check:launch-execution-plan',
  'npm.cmd run check:manual-launch-checklist',
  'npx.cmd tsc --noEmit --project tsconfig.mobile.json',
  'npx.cmd tsx tests/ios-bootstrap-config.test.ts',
  'npm.cmd run check:auth-sdk-patch',
  'npx.cmd tsx tests/capacitor-auth-storage.test.ts',
  'npx.cmd tsx tests/auth-storage-initialization.test.ts',
  'npx.cmd tsx tests/capacitor-auth-plugin-packaging.test.ts',
  'npx.cmd tsx tests/capacitor-camera.test.ts',
  'npx.cmd tsx tests/camera-flow-integration.test.ts',
  'npx.cmd tsx tests/ios-media-configuration.test.ts',
  'npx.cmd tsx tests/capacitor-files.test.ts',
  'npx.cmd tsx tests/capacitor-file-preview-packaging.test.ts',
  'npm.cmd run build:mobile:api',
  'npm.cmd run verify:mobile',
  'npm.cmd run smoke:mobile',
]) assert.ok(windowsMobileJob.includes(contract), `missing Windows CI contract: ${contract}`);
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
