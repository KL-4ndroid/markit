const configuredBaseUrl = process.env.APP_API_SMOKE_BASE_URL?.trim();
const allowedOrigin = process.env.APP_API_SMOKE_ALLOWED_ORIGIN?.trim() || 'capacitor://localhost';
const deniedOrigin = process.env.APP_API_SMOKE_DENIED_ORIGIN?.trim() || 'https://not-allowed.invalid';
const timeoutMs = 15_000;

function requireHttpsBase(value) {
  if (!value) throw new Error('APP_API_SMOKE_BASE_URL is required.');
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('APP_API_SMOKE_BASE_URL must be an absolute HTTPS URL without credentials, query, or fragment.');
  }
  return value.replace(/\/+$/, '');
}

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...init.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

async function assertPreflight(path, method) {
  const response = await request(path, {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': method,
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  });
  assertEqual(response.status, 204, `${path} preflight status`);
  assertEqual(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
    `${path} preflight origin`
  );
  await response.body?.cancel();
}

const baseUrl = requireHttpsBase(configuredBaseUrl);

const health = await request('/api/health');
assertEqual(health.status, 200, 'health status');
assertEqual(health.headers.get('cache-control'), 'no-store', 'health cache control');
const healthBody = await health.json();
if (healthBody?.ok !== true || healthBody?.status !== 'healthy') {
  throw new Error('health response contract is invalid');
}

await assertPreflight('/api/sales-photo-evidence/upload', 'POST');
await assertPreflight('/api/sales-photo-evidence/image', 'GET');

const denied = await request('/api/health', {
  headers: { Origin: deniedOrigin },
});
assertEqual(denied.status, 403, 'disallowed origin status');
const deniedBody = await denied.json();
assertEqual(deniedBody?.code, 'cors_origin_denied', 'disallowed origin code');

const invalidToken = await request(
  '/api/sales-photo-evidence/image?evidenceId=00000000-0000-4000-8000-000000000000',
  {
    headers: {
      Origin: allowedOrigin,
      Authorization: 'Bearer invalid-smoke-token',
    },
  }
);
assertEqual(invalidToken.status, 401, 'invalid token status');
const invalidTokenBody = await invalidToken.json();
assertEqual(invalidTokenBody?.code, 'authentication_required', 'invalid token code');

console.log('PASS Vercel API boundary smoke (health, CORS, invalid token)');
