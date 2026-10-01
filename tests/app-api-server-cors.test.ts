import assert from 'node:assert/strict';

import {
  APP_API_CORS_ALLOWED_REQUEST_HEADERS,
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
  parseAppApiCorsAllowedOrigins,
} from '../lib/api/server/cors';
import { createAppApiJsonResponse } from '../lib/api/server/response';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Application API server CORS boundary ===');

runTest('accepts exact HTTP origins and the approved iOS Capacitor origin', () => {
  const parsed = parseAppApiCorsAllowedOrigins(
    'https://app.example.test/, capacitor://localhost, https://preview.example.test'
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(
    [...parsed.origins],
    ['https://app.example.test', 'capacitor://localhost', 'https://preview.example.test']
  );
});

runTest('rejects wildcard, null, paths, queries, credentials, and unsupported schemes', () => {
  for (const configuredValue of [
    '*',
    'null',
    'https://app.example.test/api',
    'https://app.example.test?tenant=one',
    'https://app.example.test#fragment',
    'https://user:password@app.example.test',
    'ftp://app.example.test',
    'capacitor://other-host',
    'https://app.example.test,,https://preview.example.test',
  ]) {
    const parsed = parseAppApiCorsAllowedOrigins(configuredValue);
    assert.equal(parsed.ok, false, configuredValue);
  }
});

runTest('allows same-origin requests without adding a credentials header', async () => {
  const request = new Request('https://app.example.test/api/example', {
    headers: {
      Origin: 'https://app.example.test',
    },
  });
  const response = applyAppApiCors(
    request,
    createAppApiJsonResponse({ ok: true }, {
      status: 202,
      headers: { Vary: 'Accept-Encoding' },
    }),
    { configuredAllowedOrigins: null }
  );

  assert.equal(response.status, 202);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example.test');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.equal(response.headers.get('Vary'), 'Accept-Encoding, Origin');
  assert.deepEqual(await response.json(), { ok: true });
});

runTest('allows the exact Capacitor origin and rejects a different cross-origin caller', async () => {
  const options = { configuredAllowedOrigins: 'capacitor://localhost' };
  const allowed = applyAppApiCors(
    new Request('https://api.example.test/api/example', {
      headers: { Origin: 'capacitor://localhost' },
    }),
    createAppApiJsonResponse({ ok: true }),
    options
  );
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');

  const denied = applyAppApiCors(
    new Request('https://api.example.test/api/example', {
      headers: { Origin: 'https://attacker.example.test' },
    }),
    createAppApiJsonResponse({ secret: 'must-not-be-returned' }),
    options
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(JSON.stringify(await denied.json()).includes('must-not-be-returned'), false);
});

runTest('supports fail-fast rejection before side-effecting handler work begins', async () => {
  let sideEffectCount = 0;
  const request = new Request('https://api.example.test/api/example', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example.test' },
  });

  const rejection = createAppApiCorsRejectionResponse(request, {
    configuredAllowedOrigins: 'capacitor://localhost',
  });
  if (!rejection) sideEffectCount++;

  assert.equal(sideEffectCount, 0);
  assert.ok(rejection);
  assert.equal(rejection.status, 403);
  assert.equal((await rejection.json()).code, 'cors_origin_denied');

  const allowed = createAppApiCorsRejectionResponse(
    new Request('https://api.example.test/api/example', {
      method: 'POST',
      headers: { Origin: 'capacitor://localhost' },
    }),
    { configuredAllowedOrigins: 'capacitor://localhost' }
  );
  assert.equal(allowed, null);
});

runTest('fails closed when the configured allowlist is invalid', async () => {
  const response = applyAppApiCors(
    new Request('https://api.example.test/api/example'),
    createAppApiJsonResponse({ ok: true }),
    { configuredAllowedOrigins: '*' }
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: 'cors_configuration_invalid',
    message: 'Application API CORS configuration is invalid.',
    retryable: true,
  });
});

runTest('returns an exact 204 preflight contract for the Capacitor origin', () => {
  const response = createAppApiCorsPreflightResponse(
    new Request('https://api.example.test/api/example', {
      method: 'OPTIONS',
      headers: {
        Origin: 'capacitor://localhost',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type, x-request-id',
      },
    }),
    {
      configuredAllowedOrigins: 'capacitor://localhost',
      allowedMethods: ['POST', 'OPTIONS'],
    }
  );

  assert.equal(response.status, 204);
  assert.equal(response.body, null);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(
    response.headers.get('Access-Control-Allow-Headers'),
    APP_API_CORS_ALLOWED_REQUEST_HEADERS.join(', ')
  );
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.equal(response.headers.get('Vary'), 'Origin');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

runTest('rejects preflight methods and headers outside the declared contract', () => {
  const fixtures: HeadersInit[] = [
    {
      Origin: 'capacitor://localhost',
      'Access-Control-Request-Method': 'DELETE',
    },
    {
      Origin: 'capacitor://localhost',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, x-unsafe-header',
    },
  ];
  for (const headers of fixtures) {
    const response = createAppApiCorsPreflightResponse(
      new Request('https://api.example.test/api/example', {
        method: 'OPTIONS',
        headers,
      }),
      {
        configuredAllowedOrigins: 'capacitor://localhost',
        allowedMethods: ['POST', 'OPTIONS'],
      }
    );
    assert.equal(response.status, 403);
  }
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
    throw new Error(`${failed} application API server CORS tests failed`);
  }
}

void main();
