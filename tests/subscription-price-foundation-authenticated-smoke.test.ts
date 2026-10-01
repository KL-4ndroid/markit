import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSubscriptionPriceFoundationSmokeRouteHandler } from '../app/api/dev/subscription-price-foundation-smoke/route';
import { runAuthenticatedSubscriptionPriceFoundationSmoke } from '../lib/subscription/subscription-price-foundation-smoke.server';
import { runSubscriptionPriceFoundationSmoke } from '../lib/subscription/subscription-price-foundation-smoke-client';

async function main(): Promise<void> {
const denialFetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  const isRpc = url.includes('/rpc/');
  return new Response(JSON.stringify({ code: isRpc ? 'PGRST202' : '42501' }), {
    status: isRpc ? 404 : 401,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

const summary = await runAuthenticatedSubscriptionPriceFoundationSmoke({
  supabaseUrl: 'https://project.supabase.co',
  publicKey: 'public-key',
  accessToken: 'verified-user-token',
  fetchImpl: denialFetch,
});
assert.equal(summary.passed, true);
assert.equal(summary.passedChecks, 15);
assert.equal(summary.totalChecks, 15);
assert.equal(summary.probes.length, 15);

let requestIndex = 0;
const oneAllowedFetch = (async (input: RequestInfo | URL) => {
  requestIndex += 1;
  if (requestIndex === 1) return new Response('[]', { status: 200 });
  return denialFetch(input);
}) as typeof fetch;
const failedSummary = await runAuthenticatedSubscriptionPriceFoundationSmoke({
  supabaseUrl: 'https://project.supabase.co',
  publicKey: 'public-key',
  accessToken: 'verified-user-token',
  fetchImpl: oneAllowedFetch,
});
assert.equal(failedSummary.passed, false);
assert.equal(failedSummary.passedChecks, 14);

const routeHandler = createSubscriptionPriceFoundationSmokeRouteHandler({
  resolveActor: async () => ({ actorId: '00000000-0000-4000-8000-000000000001' }),
  runSmoke: async () => summary,
});
const routeResponse = await routeHandler(
  new Request('http://localhost:3010/api/dev/subscription-price-foundation-smoke'),
);
assert.equal(routeResponse.status, 200);
assert.deepEqual(await routeResponse.json(), { ok: true, available: true, ...summary });

const authRequired = await createSubscriptionPriceFoundationSmokeRouteHandler({
  resolveActor: async () => null,
  runSmoke: async () => summary,
})(new Request('http://localhost:3010/api/dev/subscription-price-foundation-smoke'));
assert.equal(authRequired.status, 401);

let clientAuthorization = '';
const clientResult = await runSubscriptionPriceFoundationSmoke({
  accessToken: 'verified-user-token',
  fetchImpl: (async (_input, init) => {
    clientAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
    return new Response(JSON.stringify({
      ok: true,
      available: true,
      passed: true,
      passedChecks: 15,
      totalChecks: 15,
      probes: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch,
});
assert.equal(clientAuthorization, 'Bearer verified-user-token');
assert.deepEqual(clientResult, { ok: true, passed: true, passedChecks: 15, totalChecks: 15 });

const root = process.cwd();
const routeSource = readFileSync(
  join(root, 'app/api/dev/subscription-price-foundation-smoke/route.ts'),
  'utf8',
);
const serverSource = readFileSync(
  join(root, 'lib/subscription/subscription-price-foundation-smoke.server.ts'),
  'utf8',
);
const panelSource = readFileSync(
  join(root, 'components/subscription/SubscriptionSimulationPanel.tsx'),
  'utf8',
);
const runWithCors = routeSource.slice(routeSource.indexOf('async function runWithCors'));

assert.ok(
  runWithCors.indexOf('isSubscriptionSimulationRequestAllowed(request)')
    < runWithCors.indexOf('createAppApiCorsRejectionResponse(request'),
  'deployment denial must happen before CORS or authentication work',
);
assert.match(serverSource, /import 'server-only'/);
assert.match(serverSource, /pro_monthly_twd_launch_v1/);
assert.match(serverSource, /__denial_smoke_missing__/);
assert.match(serverSource, /MISSING_ROW_ID/);
assert.doesNotMatch(routeSource + serverSource, /SUPABASE_SECRET_KEY|service_role|subscription_accounts/);
assert.doesNotMatch(routeSource + serverSource, /console\.(?:log|error)|localStorage|sessionStorage/);
assert.match(panelSource, /data-testid="subscription-price-foundation-smoke"/);
assert.match(panelSource, /驗證資料庫權限/);
assert.match(panelSource, /資料庫權限驗證通過/);

console.log('PASS authenticated F3A denial smoke route and UI contract');
}

void main();
