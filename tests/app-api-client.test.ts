import assert from 'node:assert/strict';

import {
  AppApiUrlError,
  buildAppApiUrl,
} from '../lib/api/client';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function assertApiUrlError(
  fn: () => unknown,
  expectedCode: AppApiUrlError['code']
): void {
  assert.throws(fn, error => (
    error instanceof AppApiUrlError
    && error.code === expectedCode
  ));
}

console.log('\n=== Application API client boundary ===');

runTest('uses a same-origin relative API path for ordinary Web deployments', () => {
  assert.equal(
    buildAppApiUrl('/api/example?value=1', {
      configuredBaseUrl: null,
      runtimeProtocol: 'https:',
      buildTarget: 'web',
    }),
    '/api/example?value=1'
  );
});

runTest('joins an absolute configured API base and preserves its path prefix', () => {
  assert.equal(
    buildAppApiUrl('/api/example?value=1', {
      configuredBaseUrl: '  https://mobile-api.example.test/v1/  ',
      runtimeProtocol: 'capacitor:',
    }),
    'https://mobile-api.example.test/v1/api/example?value=1'
  );
});

runTest('rejects relative, credentialed, and non-HTTP configured API bases', () => {
  for (const configuredBaseUrl of [
    '/relative-api',
    'ftp://mobile-api.example.test',
    'https://user:password@mobile-api.example.test',
    'https://mobile-api.example.test?tenant=one',
  ]) {
    assertApiUrlError(
      () => buildAppApiUrl('/api/example', { configuredBaseUrl }),
      'api_base_url_invalid'
    );
  }
});

runTest('requires a configured remote base outside an HTTP(S) Web origin', () => {
  assertApiUrlError(
    () => buildAppApiUrl('/api/example', {
      configuredBaseUrl: null,
      runtimeProtocol: 'capacitor:',
    }),
    'api_base_url_required'
  );
});

runTest('requires a configured remote base for a mobile build even on a static HTTP test server', () => {
  assertApiUrlError(
    () => buildAppApiUrl('/api/example', {
      configuredBaseUrl: null,
      runtimeProtocol: 'http:',
      buildTarget: 'mobile',
    }),
    'api_base_url_required'
  );
});

runTest('requires HTTPS for mobile and Capacitor API bases', () => {
  assertApiUrlError(
    () => buildAppApiUrl('/api/example', {
      configuredBaseUrl: 'http://api.example.test',
      runtimeProtocol: 'capacitor:',
    }),
    'api_base_url_insecure'
  );
  assertApiUrlError(
    () => buildAppApiUrl('/api/example', {
      configuredBaseUrl: 'http://127.0.0.1:3000',
      runtimeProtocol: 'http:',
      buildTarget: 'mobile',
    }),
    'api_base_url_insecure'
  );
});

runTest('rejects paths that could replace the configured API authority', () => {
  assertApiUrlError(
    () => buildAppApiUrl('//attacker.example/path', {
      configuredBaseUrl: 'https://mobile-api.example.test',
    }),
    'api_path_invalid'
  );
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
    throw new Error(`${failed} application API client boundary tests failed`);
  }
}

void main();
