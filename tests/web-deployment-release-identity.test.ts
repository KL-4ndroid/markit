import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertHealthReleaseIdentity,
  requireExpectedCommitSha,
} from '../scripts/web-smoke-release-identity.mjs';

assert.equal(requireExpectedCommitSha('ABCDEF1234567890'), 'abcdef1');
assert.throws(() => requireExpectedCommitSha(undefined), /WEB_SMOKE_EXPECTED_COMMIT_SHA/);
assert.throws(() => requireExpectedCommitSha('not-a-sha'), /WEB_SMOKE_EXPECTED_COMMIT_SHA/);

const validHealth = {
  ok: true,
  status: 'healthy',
  release: {
    version: '0.1.0',
    commitSha: 'abcdef1234567890',
    buildTime: '2026-07-30T12:00:00.000Z',
  },
};
assert.doesNotThrow(() => assertHealthReleaseIdentity(validHealth, 'abcdef1'));
assert.throws(
  () => assertHealthReleaseIdentity(validHealth, '1234567'),
  /commit does not match/,
);
assert.throws(
  () => assertHealthReleaseIdentity({
    ...validHealth,
    release: { ...validHealth.release, version: 'development' },
  }, 'abcdef1'),
  /version is unavailable/,
);
assert.throws(
  () => assertHealthReleaseIdentity({
    ...validHealth,
    release: { ...validHealth.release, buildTime: null },
  }, 'abcdef1'),
  /build time is unavailable/,
);

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const stagingSmoke = read('scripts/smoke-vercel-api.mjs');
const productionSmoke = read('scripts/smoke-web-production-boundary.mjs');
const manifest = read('scripts/test-files.txt');
const runbook = read('docs/WEB_DEPLOYMENT_RELEASE_IDENTITY.md');

for (const smoke of [stagingSmoke, productionSmoke]) {
  assert.ok(smoke.includes('WEB_SMOKE_EXPECTED_COMMIT_SHA'));
  assert.ok(smoke.includes('assertHealthReleaseIdentity'));
}
assert.ok(manifest.includes('tsx tests/web-deployment-release-identity.test.ts'));
assert.ok(runbook.includes('never proves a deployment from URL reachability alone'));
assert.ok(runbook.includes('does not expose secrets, environment values, or configuration readiness'));

console.log('PASS commit-bound Web deployment release identity');
