import assert from 'node:assert/strict';

import {
  authenticateAppApiRequest,
  getAppApiBearerToken,
  getAppApiSupabasePublicConfig,
} from '../lib/api/server/auth';

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function request(authorization?: string): Request {
  return new Request('https://api.example.test/api/example', {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

console.log('\n=== Application API server authentication ===');

runTest('parses one bounded Bearer token case-insensitively', () => {
  assert.equal(getAppApiBearerToken(request('Bearer token-value')), 'token-value');
  assert.equal(getAppApiBearerToken(request('bearer token-value')), 'token-value');
  assert.equal(getAppApiBearerToken(request()), null);
  assert.equal(getAppApiBearerToken(request('Basic token-value')), null);
  assert.equal(getAppApiBearerToken(request('Bearer')), null);
  assert.equal(getAppApiBearerToken(request('Bearer two tokens')), null);
  assert.equal(getAppApiBearerToken(request(`Bearer ${'x'.repeat(8_193)}`)), null);
});

runTest('accepts HTTPS Supabase config and rejects unsafe or incomplete config', () => {
  assert.deepEqual(getAppApiSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  }), {
    url: 'https://project.supabase.co',
    publicKey: 'public-key',
  });
  assert.equal(getAppApiSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'http://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  }), null);
  assert.equal(getAppApiSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'ftp://localhost',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  }), null);
  assert.equal(getAppApiSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  }), null);
});

runTest('derives actor identity only from verified token user', async () => {
  let receivedToken = '';
  const result = await authenticateAppApiRequest(request('Bearer verified-token'), {
    verifier: {
      async getUser(token) {
        receivedToken = token;
        return {
          data: { user: { id: 'verified-user-id' } },
          error: null,
        };
      },
    },
  });

  assert.equal(receivedToken, 'verified-token');
  assert.deepEqual(result, {
    ok: true,
    actor: { actorId: 'verified-user-id' },
  });
});

runTest('fails closed for absent invalid or unverifiable tokens', async () => {
  assert.deepEqual(await authenticateAppApiRequest(request(), {
    verifier: {
      async getUser() {
        throw new Error('must not be called');
      },
    },
  }), { ok: false, code: 'authentication_required' });

  assert.deepEqual(await authenticateAppApiRequest(request('Bearer expired'), {
    verifier: {
      async getUser() {
        return { data: { user: null }, error: new Error('expired') };
      },
    },
  }), { ok: false, code: 'authentication_required' });

  assert.deepEqual(await authenticateAppApiRequest(request('Bearer token'), {
    verifier: {
      async getUser() {
        throw new Error('auth upstream unavailable');
      },
    },
  }), { ok: false, code: 'authentication_unavailable' });

  assert.deepEqual(await authenticateAppApiRequest(request('Bearer token'), {
    env: {},
  }), { ok: false, code: 'authentication_unavailable' });
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
  if (failed > 0) throw new Error(`${failed} application API server authentication tests failed`);
}

void main();
