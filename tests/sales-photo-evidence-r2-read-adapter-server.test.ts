import assert from 'node:assert/strict';

import { createCloudflareR2SalesPhotoEvidenceReadAdapter } from '../lib/sales/photo-evidence-r2-read-adapter.server';

const env = {
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
};

console.log('\n=== Sales photo evidence R2 read adapter server boundary ===');

async function main(): Promise<void> {
const valid = createCloudflareR2SalesPhotoEvidenceReadAdapter({
  env,
  client: {
    async send() {
      return {
        Body: new Uint8Array([1, 2, 3]),
        ContentType: 'image/webp',
        ContentLength: 3,
      };
    },
  },
});
assert.ok(valid);
assert.deepEqual(await valid.readObject({ key: 'key' }), {
  ok: true,
  body: new Uint8Array([1, 2, 3]),
  contentType: 'image/webp',
});
console.log('PASS accepts one bounded evidence image response');

for (const fixture of [
  {
    Body: new Uint8Array([1]),
    ContentType: 'text/plain',
    ContentLength: 1,
  },
  {
    Body: new Uint8Array([1]),
    ContentType: 'image/webp',
    ContentLength: 1_000_001,
  },
  {
    Body: new Uint8Array(),
    ContentType: 'image/jpeg',
    ContentLength: 0,
  },
]) {
  const adapter = createCloudflareR2SalesPhotoEvidenceReadAdapter({
    env,
    client: { async send() { return fixture; } },
  });
  assert.ok(adapter);
  const result = await adapter.readObject({ key: 'key' });
  assert.equal(result.ok, false);
  if (result.ok) continue;
  assert.equal(result.code, 'r2_read_failed');
  assert.equal(result.message, 'Sales photo evidence R2 read failed.');
}
console.log('PASS rejects invalid MIME, size, and empty object responses');

const failed = createCloudflareR2SalesPhotoEvidenceReadAdapter({
  env,
  client: {
    async send() {
      throw new Error('credential and endpoint detail');
    },
  },
});
assert.ok(failed);
const failure = await failed.readObject({ key: 'key' });
assert.equal(failure.ok, false);
if (!failure.ok) assert.doesNotMatch(failure.message, /credential|endpoint detail/i);
console.log('PASS sanitizes storage exceptions');
}

void main();
