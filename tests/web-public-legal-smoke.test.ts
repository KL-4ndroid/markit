import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const script = read('scripts/smoke-web-public-legal.mjs');
const packageJson = read('package.json');
const manifest = read('scripts/test-files.txt');
const runbook = read('docs/WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md');

assert.match(script, /requireExpectedCommitSha/);
assert.match(script, /assertHealthReleaseIdentity/);
assert.match(script, /assertWebSecurityHeaders/);
assert.match(script, /redirect: 'manual'/);
assert.match(script, /WEB_LEGAL_SMOKE_MODE must be draft or published/);
for (const route of ['/support', '/terms', '/privacy', '/about']) {
  assert.ok(script.includes(route), `missing public legal route: ${route}`);
}
assert.match(script, /正式政策版本/);
assert.match(script, /上架前草案/);
assert.doesNotMatch(script, /console\.log\([^\n]*(?:supportEmail|operatorAddress|process\.env)/);
assert.ok(packageJson.includes('"smoke:web:legal-support"'));
assert.ok(manifest.includes('tsx tests/web-public-legal-smoke.test.ts'));
assert.match(runbook, /npm\.cmd run smoke:web:legal-support/);
assert.match(runbook, /WEB_LEGAL_SMOKE_MODE='published'/);

console.log('PASS commit-bound public legal/support smoke contract');
