import assert from 'node:assert/strict';

import {
  GET,
  OPTIONS,
  maxDuration,
  runtime,
} from '../app/api/health/route';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

async function withCorsEnvironment<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const original = process.env.APP_API_CORS_ALLOWED_ORIGINS;
  if (value === undefined) {
    delete process.env.APP_API_CORS_ALLOWED_ORIGINS;
  } else {
    process.env.APP_API_CORS_ALLOWED_ORIGINS = value;
  }

  try {
    return await fn();
  } finally {
    if (original === undefined) {
      delete process.env.APP_API_CORS_ALLOWED_ORIGINS;
    } else {
      process.env.APP_API_CORS_ALLOWED_ORIGINS = original;
    }
  }
}

console.log('\n=== Application API health route ===');

runTest('pins the health route to the bounded Node.js runtime', () => {
  assert.equal(runtime, 'nodejs');
  assert.equal(maxDuration, 5);
});

runTest('returns only a no-store, non-secret health payload', async () => {
  await withCorsEnvironment(undefined, async () => {
    const secretSentinel = 'health-must-not-return-this-secret';
    const originalSecret = process.env.R2_SECRET_ACCESS_KEY;
    process.env.R2_SECRET_ACCESS_KEY = secretSentinel;

    try {
      const response = GET(new Request('https://app.example.test/api/health', {
        headers: { Origin: 'https://app.example.test' },
      }));
      const rawBody = await response.text();

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example.test');
      assert.equal(response.headers.get('Vary'), 'Origin');
      assert.deepEqual(JSON.parse(rawBody), { ok: true, status: 'healthy' });
      assert.equal(rawBody.includes(secretSentinel), false);
    } finally {
      if (originalSecret === undefined) {
        delete process.env.R2_SECRET_ACCESS_KEY;
      } else {
        process.env.R2_SECRET_ACCESS_KEY = originalSecret;
      }
    }
  });
});

runTest('serves an exact Capacitor preflight without credentials wildcard', async () => {
  await withCorsEnvironment('capacitor://localhost', async () => {
    const response = OPTIONS(new Request('https://api.example.test/api/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'capacitor://localhost',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization, x-request-id',
      },
    }));

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
    assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
    assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  });
});

runTest('fails closed for disallowed origins and invalid wildcard configuration', async () => {
  await withCorsEnvironment('https://app.example.test', async () => {
    const denied = GET(new Request('https://api.example.test/api/health', {
      headers: { Origin: 'capacitor://localhost' },
    }));
    assert.equal(denied.status, 403);
  });

  await withCorsEnvironment('*', async () => {
    const invalid = GET(new Request('https://api.example.test/api/health'));
    assert.equal(invalid.status, 500);
  });
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} application API health route tests failed`);
  }
}

void main();
