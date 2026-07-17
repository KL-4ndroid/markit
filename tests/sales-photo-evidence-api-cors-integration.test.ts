import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';

const testRequire = createRequire(import.meta.url);
const serverOnlyPath = testRequire.resolve('server-only');
const serverOnlyMarker = new Module(serverOnlyPath);
serverOnlyMarker.filename = serverOnlyPath;
serverOnlyMarker.loaded = true;
serverOnlyMarker.exports = {};
testRequire.cache[serverOnlyPath] = serverOnlyMarker;

const {
  OPTIONS: uploadOptions,
  POST: uploadPost,
} = testRequire('../app/api/sales-photo-evidence/upload/route') as typeof import(
  '../app/api/sales-photo-evidence/upload/route'
);
const {
  GET: imageGet,
  OPTIONS: imageOptions,
} = testRequire('../app/api/sales-photo-evidence/image/route') as typeof import(
  '../app/api/sales-photo-evidence/image/route'
);

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const CAPACITOR_ORIGIN = 'capacitor://localhost';

function preflight(url: string, method: string): Request {
  return new Request(url, {
    method: 'OPTIONS',
    headers: {
      Origin: CAPACITOR_ORIGIN,
      'Access-Control-Request-Method': method,
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  });
}

async function withCorsEnv(fn: () => Promise<void>): Promise<void> {
  const previous = process.env.APP_API_CORS_ALLOWED_ORIGINS;
  process.env.APP_API_CORS_ALLOWED_ORIGINS = `https://app.example.test,${CAPACITOR_ORIGIN}`;
  try {
    await fn();
  } finally {
    if (previous === undefined) delete process.env.APP_API_CORS_ALLOWED_ORIGINS;
    else process.env.APP_API_CORS_ALLOWED_ORIGINS = previous;
  }
}

console.log('\n=== Sales photo evidence API CORS integration ===');

runTest('upload and image endpoints accept exact Capacitor preflight contracts', async () => {
  await withCorsEnv(async () => {
    const upload = uploadOptions(preflight('https://api.example.test/api/sales-photo-evidence/upload', 'POST'));
    const image = imageOptions(preflight('https://api.example.test/api/sales-photo-evidence/image', 'GET'));

    assert.equal(upload.status, 204);
    assert.equal(upload.headers.get('access-control-allow-origin'), CAPACITOR_ORIGIN);
    assert.match(upload.headers.get('access-control-allow-methods') ?? '', /POST/);
    assert.equal(image.status, 204);
    assert.equal(image.headers.get('access-control-allow-origin'), CAPACITOR_ORIGIN);
    assert.match(image.headers.get('access-control-allow-methods') ?? '', /GET/);
  });
});

runTest('upload rejects a disallowed origin before route enablement or body parsing', async () => {
  await withCorsEnv(async () => {
    let bodyRead = false;
    const request = {
      url: 'https://api.example.test/api/sales-photo-evidence/upload',
      method: 'POST',
      headers: new Headers({
        Origin: 'https://attacker.example',
        'content-type': 'application/json',
      }),
      async json() {
        bodyRead = true;
        return {};
      },
    } as unknown as Request;

    const response = await uploadPost(request);
    const body = await response.json() as { code: string; retryable: boolean };
    assert.equal(response.status, 403);
    assert.equal(body.code, 'cors_origin_denied');
    assert.equal(body.retryable, false);
    assert.equal(bodyRead, false);
  });
});

runTest('allowed actual Capacitor responses retain exact CORS headers on failures', async () => {
  await withCorsEnv(async () => {
    const response = await imageGet(new Request(
      'https://api.example.test/api/sales-photo-evidence/image?evidenceId=evidence-id',
      { headers: { Origin: CAPACITOR_ORIGIN } }
    ));
    const body = await response.json() as { code: string; retryable: boolean };

    assert.equal(response.status, 501);
    assert.equal(body.code, 'sales_photo_evidence_image_read_disabled');
    assert.equal(body.retryable, false);
    assert.equal(response.headers.get('access-control-allow-origin'), CAPACITOR_ORIGIN);
    assert.match(response.headers.get('vary') ?? '', /Origin/i);
  });
});

async function main(): Promise<void> {
  let failed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }
  if (failed > 0) throw new Error(`${failed} sales photo evidence API CORS integration tests failed`);
}

void main();
