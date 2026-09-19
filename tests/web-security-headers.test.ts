import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertWebSecurityHeaders,
  EXPECTED_WEB_SECURITY_HEADERS,
} from '../scripts/web-smoke-security-headers.mjs';

const validHeaders = new Headers(EXPECTED_WEB_SECURITY_HEADERS);
assert.doesNotThrow(() => assertWebSecurityHeaders(validHeaders));

for (const name of Object.keys(EXPECTED_WEB_SECURITY_HEADERS)) {
  const missing = new Headers(EXPECTED_WEB_SECURITY_HEADERS);
  missing.delete(name);
  assert.throws(() => assertWebSecurityHeaders(missing), new RegExp(name));
}

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const nextConfig = read('next.config.mjs');
const stagingSmoke = read('scripts/smoke-vercel-api.mjs');
const productionSmoke = read('scripts/smoke-web-production-boundary.mjs');
const antiFrameProbe = read('scripts/create-web-anti-frame-probe.mjs');
const manifest = read('scripts/test-files.txt');
const runbook = read('docs/WEB_SECURITY_HEADERS.md');

for (const [name, expected] of Object.entries(EXPECTED_WEB_SECURITY_HEADERS)) {
  if (name === 'content-security-policy') {
    for (const directive of expected.split('; ')) {
      assert.ok(nextConfig.includes(directive), `next.config must include CSP ${directive}`);
    }
    continue;
  }
  assert.ok(nextConfig.includes(expected), `next.config must include ${name}`);
}
assert.match(nextConfig, /source: '\/:path\*'[\s\S]*headers: webSecurityHeaders/);
assert.doesNotMatch(nextConfig, /Cross-Origin-Opener-Policy/);
assert.doesNotMatch(
  EXPECTED_WEB_SECURITY_HEADERS['content-security-policy'],
  /script-src|style-src|connect-src|unsafe-inline|unsafe-eval/,
);

for (const smoke of [stagingSmoke, productionSmoke]) {
  assert.ok(smoke.includes('assertWebSecurityHeaders'));
}
assert.ok(productionSmoke.includes('assertWebSecurityHeaders(demo.headers)'));
assert.ok(manifest.includes('tsx tests/web-security-headers.test.ts'));
assert.ok(runbook.includes('resource-loading CSP is deliberately deferred'));
assert.ok(runbook.includes('does not prove the final deployment headers'));
assert.match(antiFrameProbe, /release_identity_mismatch/);
assert.match(antiFrameProbe, /https:\/\/httpbin\.org/);
assert.match(runbook, /final release candidate/);

console.log('PASS Web baseline security header contract');
