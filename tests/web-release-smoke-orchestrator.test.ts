import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildWebReleaseSmokeChecks,
  createWebReleaseSmokeReport,
  parseWebReleaseSmokeOptions,
  WEB_RELEASE_SMOKE_CHECK_IDS,
} from '../lib/deployment/web-release-smoke';

const options = parseWebReleaseSmokeOptions([
  '--legal-mode=draft',
  '--expected-commit=ABCDEF1234567890',
  '--base-url=https://app.example.com/',
]);
assert.deepEqual(options, {
  baseUrl: 'https://app.example.com',
  expectedCommitSha: 'abcdef1',
  legalMode: 'draft',
});

for (const args of [
  [],
  ['--base-url=https://app.example.com'],
  ['--base-url=http://app.example.com', '--expected-commit=abcdef1', '--legal-mode=draft'],
  ['--base-url=https://user:pass@app.example.com', '--expected-commit=abcdef1', '--legal-mode=draft'],
  ['--base-url=https://app.example.com/path', '--expected-commit=abcdef1', '--legal-mode=draft'],
  ['--base-url=https://app.example.com?x=1', '--expected-commit=abcdef1', '--legal-mode=draft'],
  ['--base-url=https://app.example.com', '--expected-commit=wrong', '--legal-mode=draft'],
  ['--base-url=https://app.example.com', '--expected-commit=abcdef1', '--legal-mode=review'],
  ['--base-url=https://app.example.com', '--base-url=https://other.example.com', '--legal-mode=draft'],
  ['--base-url=https://app.example.com', '--expected-commit=abcdef1', '--unknown=value'],
]) {
  assert.throws(() => parseWebReleaseSmokeOptions(args), /argument_invalid/);
}

const checks = buildWebReleaseSmokeChecks(options);
assert.deepEqual(checks.map(check => check.id), WEB_RELEASE_SMOKE_CHECK_IDS);
assert.deepEqual(checks.map(check => check.scriptPath), [
  'scripts/smoke-web-production-boundary.mjs',
  'scripts/smoke-web-pwa-resources.mjs',
  'scripts/smoke-web-public-legal.mjs',
  'scripts/smoke-vercel-api.mjs',
]);
for (const check of checks) {
  assert.equal(check.environment.WEB_SMOKE_EXPECTED_COMMIT_SHA, 'abcdef1');
}
assert.equal(checks[2].environment.WEB_LEGAL_SMOKE_MODE, 'draft');
assert.equal(checks[3].environment.APP_API_SMOKE_ALLOWED_ORIGIN, 'capacitor://localhost');
assert.equal(checks[3].environment.APP_API_SMOKE_DENIED_ORIGIN, 'https://not-allowed.invalid');

const passedResults = WEB_RELEASE_SMOKE_CHECK_IDS.map(id => ({ id, status: 'passed' as const }));
const passed = createWebReleaseSmokeReport(
  options,
  '2026-08-01T12:00:00.000Z',
  passedResults,
);
assert.equal(passed.ready, true);
assert.deepEqual(
  { passed: passed.passedCount, failed: passed.failedCount, notRun: passed.notRunCount },
  { passed: 4, failed: 0, notRun: 0 },
);

const failed = createWebReleaseSmokeReport(options, '2026-08-01T12:00:00.000Z', [
  { id: 'production_surface', status: 'passed' },
  { id: 'pwa_resources', status: 'failed' },
  { id: 'legal_support', status: 'not_run' },
  { id: 'api_boundary', status: 'not_run' },
]);
assert.equal(failed.ready, false);
assert.deepEqual(
  { passed: failed.passedCount, failed: failed.failedCount, notRun: failed.notRunCount },
  { passed: 1, failed: 1, notRun: 2 },
);
assert.throws(
  () => createWebReleaseSmokeReport(options, 'invalid', passedResults),
  /timestamp_invalid/,
);
assert.throws(
  () => createWebReleaseSmokeReport(options, '2026-08-01T12:00:00.000Z', passedResults.slice(1)),
  /result_invalid/,
);
assert.throws(
  () => createWebReleaseSmokeReport(options, '2026-08-01T12:00:00.000Z', [
    { id: 'production_surface', status: 'not_run' },
    { id: 'pwa_resources', status: 'not_run' },
    { id: 'legal_support', status: 'not_run' },
    { id: 'api_boundary', status: 'not_run' },
  ]),
  /result_invalid/,
);
assert.throws(
  () => createWebReleaseSmokeReport(options, '2026-08-01T12:00:00.000Z', [
    { id: 'production_surface', status: 'failed' },
    { id: 'pwa_resources', status: 'passed' },
    { id: 'legal_support', status: 'not_run' },
    { id: 'api_boundary', status: 'not_run' },
  ]),
  /result_invalid/,
);

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const cli = read('scripts/run-web-release-smoke.ts');
const packageJson = read('package.json');
const manifest = read('scripts/test-files.txt');
const runbook = read('docs/WEB_RELEASE_SMOKE_ORCHESTRATOR.md');

assert.match(cli, /spawnSync\(process\.execPath/);
assert.match(cli, /windowsHide: true/);
assert.match(cli, /maxBuffer: CHILD_MAX_BUFFER_BYTES/);
assert.doesNotMatch(cli, /shell:\s*true/);
assert.doesNotMatch(cli, /child\.(?:stdout|stderr)/);
assert.ok(packageJson.includes('"smoke:web:release"'));
assert.ok(manifest.includes('tsx tests/web-release-smoke-orchestrator.test.ts'));
assert.ok(manifest.includes('tsx tests/web-release-smoke-cli.test.ts'));
assert.match(runbook, /does not print child stdout, stderr, response bodies, or environment values/);

console.log('PASS bounded commit-bound Web release smoke orchestrator');
