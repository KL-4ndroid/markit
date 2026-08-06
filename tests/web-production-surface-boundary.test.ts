import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isInternalTestSurfaceAvailable } from '../lib/deployment/internal-test-surface';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

assert.equal(isInternalTestSurfaceAvailable({ NODE_ENV: 'development' }), true);
assert.equal(isInternalTestSurfaceAvailable({ NODE_ENV: 'test' }), true);
assert.equal(isInternalTestSurfaceAvailable({ NODE_ENV: 'production' }), false);
assert.equal(
  isInternalTestSurfaceAvailable({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
    INTERNAL_TEST_SURFACES_ENABLED: '1',
  }),
  true,
);
assert.equal(
  isInternalTestSurfaceAvailable({
    NODE_ENV: 'production',
    APP_ENV: 'staging',
    INTERNAL_TEST_SURFACES_ENABLED: '1',
  }),
  true,
);
assert.equal(
  isInternalTestSurfaceAvailable({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    INTERNAL_TEST_SURFACES_ENABLED: '1',
  }),
  false,
);

const debugLayout = read('app/debug/layout.tsx');
assert.match(debugLayout, /isInternalTestSurfaceAvailable\(\)/);
assert.match(debugLayout, /notFound\(\)/);
assert.match(debugLayout, /dynamic = 'force-dynamic'/);
assert.match(debugLayout, /index: false/);
assert.match(debugLayout, /follow: false/);

const productionProxy = read('proxy.ts');
assert.match(productionProxy, /matcher: \['\/debug\/:path\*'\]/);
assert.match(productionProxy, /isInternalTestSurfaceAvailable\(\)/);
assert.match(productionProxy, /status: 404/);
assert.match(productionProxy, /'Cache-Control': 'no-store'/);
assert.match(productionProxy, /'X-Robots-Tag': 'noindex, nofollow'/);
assert.doesNotMatch(productionProxy, /\/demo|\/api\//);

const simulationRoute = read('app/api/dev/subscription-simulation/route.ts');
const runWithCors = simulationRoute.slice(simulationRoute.indexOf('async function runWithCors'));
assert.ok(
  runWithCors.indexOf('isSubscriptionSimulationRequestAllowed(request)')
    < runWithCors.indexOf('createAppApiCorsRejectionResponse(request'),
  'deployment denial must happen before CORS or authentication work',
);
assert.match(runWithCors, /404, 'dev_tool_unavailable'/);

const priceSmokeRoute = read('app/api/dev/subscription-price-foundation-smoke/route.ts');
const priceSmokeRunWithCors = priceSmokeRoute.slice(priceSmokeRoute.indexOf('async function runWithCors'));
assert.ok(
  priceSmokeRunWithCors.indexOf('isSubscriptionSimulationRequestAllowed(request)')
    < priceSmokeRunWithCors.indexOf('createAppApiCorsRejectionResponse(request'),
  'price smoke deployment denial must happen before CORS or authentication work',
);
assert.match(priceSmokeRunWithCors, /404, 'dev_tool_unavailable'/);

const smoke = read('scripts/smoke-web-production-boundary.mjs');
for (const route of [
  '/debug/flicker-test',
  '/debug/staff-role-test',
  '/debug/sales-photo-evidence',
  '/api/dev/subscription-simulation',
  '/api/dev/subscription-price-foundation-smoke',
  '/demo',
]) {
  assert.ok(smoke.includes(route), `production boundary smoke must cover ${route}`);
}
assert.match(smoke, /demo\.status, 200/);
assert.match(smoke, /dev_tool_unavailable/);

const packageJson = read('package.json');
const manifest = read('scripts/test-files.txt');
const envExample = read('.env.example');
const runbook = read('docs/WEB_PRODUCTION_BOUNDARY_SMOKE.md');
const roleDistribution = read('docs/role-permission-distribution.md');

assert.ok(packageJson.includes('"smoke:web:production-boundary"'));
assert.ok(manifest.includes('tsx tests/web-production-surface-boundary.test.ts'));
assert.ok(envExample.includes('INTERNAL_TEST_SURFACES_ENABLED=0'));
assert.ok(runbook.includes('production still returns `404`'));
assert.ok(runbook.includes('does not authorize production deployment'));
assert.ok(roleDistribution.includes('`app/debug/layout.tsx`'));
assert.ok(roleDistribution.includes('`proxy.ts`'));

console.log('PASS Web production debug and dev API surface boundary');
