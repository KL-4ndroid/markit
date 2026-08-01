import {
  assertHealthReleaseIdentity,
  requireExpectedCommitSha,
} from './web-smoke-release-identity.mjs';
import { assertWebSecurityHeaders } from './web-smoke-security-headers.mjs';

const configuredBaseUrl = process.env.WEB_PRODUCTION_BOUNDARY_BASE_URL?.trim();
const timeoutMs = 15_000;
const expectedCommitSha = requireExpectedCommitSha(process.env.WEB_SMOKE_EXPECTED_COMMIT_SHA);

function requireBaseUrl(value) {
  if (!value) throw new Error('WEB_PRODUCTION_BOUNDARY_BASE_URL is required.');
  const parsed = new URL(value);
  const loopbackHttp = parsed.protocol === 'http:'
    && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
  if (
    (parsed.protocol !== 'https:' && !loopbackHttp)
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('Production boundary base must be HTTPS or loopback HTTP without credentials, path, query, or fragment.');
  }
  return parsed.origin;
}

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

async function assertPageNotFound(path) {
  const response = await request(path);
  assertEqual(response.status, 404, `${path} status`);
  await response.body?.cancel();
}

async function assertDevApiNotFound(method, init = {}) {
  const response = await request('/api/dev/subscription-simulation', { method, ...init });
  assertEqual(response.status, 404, `subscription simulation ${method} status`);
  const body = await response.json();
  assertEqual(body?.code, 'dev_tool_unavailable', `subscription simulation ${method} code`);
}

const baseUrl = requireBaseUrl(configuredBaseUrl);

const health = await request('/api/health');
assertEqual(health.status, 200, 'health status');
assertEqual(health.headers.get('cache-control'), 'no-store', 'health cache control');
assertWebSecurityHeaders(health.headers);
assertHealthReleaseIdentity(await health.json(), expectedCommitSha);

for (const path of [
  '/debug/flicker-test',
  '/debug/staff-role-test',
  '/debug/sales-photo-evidence',
]) {
  await assertPageNotFound(path);
}

const demo = await request('/demo');
assertEqual(demo.status, 200, 'intentional public demo status');
assertWebSecurityHeaders(demo.headers);
await demo.body?.cancel();

await assertDevApiNotFound('GET');
await assertDevApiNotFound('POST', {
  headers: { 'Content-Type': 'application/json' },
  body: '{"enabled":true,"planCode":"team"}',
});
await assertDevApiNotFound('OPTIONS', {
  headers: {
    Origin: 'https://not-allowed.invalid',
    'Access-Control-Request-Method': 'POST',
  },
});

console.log('PASS commit-bound production surface (debug 404, dev API 404, public demo available)');
