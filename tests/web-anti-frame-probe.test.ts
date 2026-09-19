import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildAntiFrameProbeUrl,
  requireExpectedCommit,
  requireHttpsOrigin,
  verifyReleaseIdentity,
} from '../scripts/create-web-anti-frame-probe.mjs';

assert.equal(requireHttpsOrigin('https://example.com/'), 'https://example.com');
for (const invalid of [
  '',
  'http://example.com',
  'https://user@example.com',
  'https://example.com/path',
  'https://example.com/?query=1',
]) {
  assert.throws(() => requireHttpsOrigin(invalid), /base_url_invalid/);
}

assert.equal(requireExpectedCommit('62BD881'), '62bd881');
assert.throws(() => requireExpectedCommit('main'), /expected_commit_invalid/);

const probeUrl = new URL(buildAntiFrameProbeUrl('https://example.com', '62bd881'));
assert.equal(probeUrl.origin, 'https://httpbin.org');
const encodedDocument = probeUrl.pathname.slice('/base64/'.length);
const probeDocument = Buffer.from(encodedDocument, 'base64url').toString('utf8');
assert.match(probeDocument, /Expected release: <code>62bd881<\/code>/);
assert.match(probeDocument, /src="https:\/\/example\.com\/"/);
assert.match(probeDocument, /referrerpolicy="no-referrer"/);
assert.doesNotMatch(probeDocument, /<script|onload=|onerror=/i);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function main(): Promise<void> {
  await assert.doesNotReject(() => verifyReleaseIdentity(
    async () => jsonResponse({ status: 'healthy', release: { commitSha: '62bd881' } }),
    'https://example.com',
    '62bd881',
  ));
  await assert.rejects(
    () => verifyReleaseIdentity(
      async () => jsonResponse({ status: 'healthy', release: { commitSha: 'older00' } }),
      'https://example.com',
      '62bd881',
    ),
    /release_identity_mismatch/,
  );

  const root = process.cwd();
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  assert.match(read('package.json'), /"prepare:web:anti-frame-probe"/);
  assert.ok(read('scripts/test-files.txt').includes('tsx tests/web-anti-frame-probe.test.ts'));
  assert.match(read('docs/WEB_SECURITY_HEADERS.md'), /prepare:web:anti-frame-probe/);

  console.log('PASS commit-bound unrelated-origin anti-frame probe contract');
}

void main();
