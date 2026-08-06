import {
  assertHealthReleaseIdentity,
  requireExpectedCommitSha,
} from './web-smoke-release-identity.mjs';
import {
  assertServiceWorkerContract,
  assertWebAppManifestContract,
  readPngDimensions,
} from './web-pwa-release-contract.mjs';
import { assertWebSecurityHeaders } from './web-smoke-security-headers.mjs';

const timeoutMs = 15_000;
const expectedCommitSha = requireExpectedCommitSha(process.env.WEB_SMOKE_EXPECTED_COMMIT_SHA);

function requireBaseUrl(value) {
  if (!value?.trim()) throw new Error('WEB_PWA_SMOKE_BASE_URL is required.');
  const parsed = new URL(value.trim());
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
    throw new Error('PWA smoke base must be HTTPS or loopback HTTP without credentials, path, query, or fragment.');
  }
  return parsed.origin;
}

async function request(baseUrl, path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
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

const baseUrl = requireBaseUrl(process.env.WEB_PWA_SMOKE_BASE_URL);

const health = await request(baseUrl, '/api/health');
assertEqual(health.status, 200, 'health status');
assertWebSecurityHeaders(health.headers);
assertHealthReleaseIdentity(await health.json(), expectedCommitSha);

const manifestResponse = await request(baseUrl, '/manifest.json');
assertEqual(manifestResponse.status, 200, 'manifest status');
assertEqual(manifestResponse.headers.get('cache-control'), 'public, max-age=0, must-revalidate', 'manifest cache control');
assertWebSecurityHeaders(manifestResponse.headers);
const manifest = await manifestResponse.json();
const assets = assertWebAppManifestContract(manifest);

for (const asset of assets) {
  const response = await request(baseUrl, asset.src);
  assertEqual(response.status, 200, `${asset.src} status`);
  assertWebSecurityHeaders(response.headers);
  const contentType = response.headers.get('content-type')?.split(';')[0];
  assertEqual(contentType, asset.type, `${asset.src} content type`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength <= 0 || bytes.byteLength > 5_000_000) {
    throw new Error(`${asset.src} body size is invalid`);
  }
  const dimensions = readPngDimensions(bytes);
  if (!asset.sizes.some(size => size.width === dimensions.width && size.height === dimensions.height)) {
    throw new Error(`${asset.src} dimensions do not match the manifest`);
  }
}

const serviceWorker = await request(baseUrl, '/sw.js');
assertEqual(serviceWorker.status, 200, 'service worker status');
assertEqual(serviceWorker.headers.get('cache-control'), 'public, max-age=0, must-revalidate', 'service worker cache control');
assertEqual(serviceWorker.headers.get('service-worker-allowed'), '/', 'service worker scope');
assertWebSecurityHeaders(serviceWorker.headers);
assertServiceWorkerContract(await serviceWorker.text());

const demo = await request(baseUrl, '/demo');
assertEqual(demo.status, 200, 'demo status');
assertWebSecurityHeaders(demo.headers);
const demoMarkup = await demo.text();
if (!demoMarkup.includes('rel="manifest"') || !demoMarkup.includes('href="/manifest.json"')) {
  throw new Error('demo page does not link the Web app manifest');
}

console.log(`PASS commit-bound PWA resources (${assets.length} unique image assets, service worker, manifest, demo)`);
