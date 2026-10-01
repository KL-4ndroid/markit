import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSubscriptionSimulationRouteHandlers,
} from '../app/api/dev/subscription-simulation/route';
import {
  parseAccountCapabilityApiSuccess,
} from '../lib/subscription/account-capability-client';
import {
  readSubscriptionSimulation as readSubscriptionSimulationClient,
  updateSubscriptionSimulation,
} from '../lib/subscription/subscription-simulation-client';
import {
  clearSubscriptionSimulation,
  isSubscriptionSimulationRequestAllowed,
  readSubscriptionSimulation,
  resolveSubscriptionSimulationForRequest,
  setSubscriptionSimulation,
  SUBSCRIPTION_SIMULATION_TTL_MS,
} from '../lib/subscription/subscription-simulation.server';
import { getAccountCapabilitySourcePresentation } from '../lib/subscription/subscription-presentation';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = Date.parse('2026-07-29T12:00:00.000Z');

async function main(): Promise<void> {
assert.equal(isSubscriptionSimulationRequestAllowed(
  new Request('http://localhost:3010/api/dev/subscription-simulation'),
  { enabled: true, deployed: false },
), true);
assert.equal(isSubscriptionSimulationRequestAllowed(
  new Request('http://127.0.0.1:3010/api/dev/subscription-simulation'),
  { enabled: true, deployed: false },
), true);
assert.equal(isSubscriptionSimulationRequestAllowed(
  new Request('https://app.example.test/api/dev/subscription-simulation'),
  { enabled: true, deployed: false },
), false);
assert.equal(isSubscriptionSimulationRequestAllowed(
  new Request('http://localhost:3010/api/dev/subscription-simulation'),
  { enabled: false, deployed: false },
), false);
assert.equal(isSubscriptionSimulationRequestAllowed(
  new Request('http://localhost:3010/api/dev/subscription-simulation'),
  { enabled: true, deployed: true },
), false);

clearSubscriptionSimulation(OWNER_ID);
assert.deepEqual(readSubscriptionSimulation(OWNER_ID, NOW), {
  enabled: false,
  planCode: null,
  expiresAt: null,
});

const proState = setSubscriptionSimulation(OWNER_ID, 'pro', NOW);
assert.equal(proState.enabled, true);
assert.equal(proState.planCode, 'pro');
assert.equal(Date.parse(proState.expiresAt ?? '') - NOW, SUBSCRIPTION_SIMULATION_TTL_MS);
assert.equal(readSubscriptionSimulation(OWNER_ID, NOW + 1).planCode, 'pro');
assert.equal(
  readSubscriptionSimulation(OWNER_ID, NOW + SUBSCRIPTION_SIMULATION_TTL_MS + 1).enabled,
  false,
);

const originalEnabled = process.env.SUBSCRIPTION_SIMULATION_ENABLED;
const originalVercel = process.env.VERCEL;
const originalVercelEnv = process.env.VERCEL_ENV;
process.env.SUBSCRIPTION_SIMULATION_ENABLED = 'true';
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;
let simulatedApiResponse: unknown = null;
try {
  for (const [planCode, expected] of [
    ['free', { basicAnalytics: false, salesPhotoEvidence: false }],
    ['pro', { basicAnalytics: true, salesPhotoEvidence: false }],
    ['team', { basicAnalytics: true, salesPhotoEvidence: true }],
  ] as const) {
    setSubscriptionSimulation(OWNER_ID, planCode, NOW);
    const resolution = resolveSubscriptionSimulationForRequest({
      request: new Request('http://localhost:3010/api/account-capabilities'),
      actorId: OWNER_ID,
      ownerId: OWNER_ID,
      nowMs: NOW,
    });
    assert.equal(resolution?.outcome, 'available');
    if (!resolution || resolution.outcome !== 'available') throw new Error('simulation must resolve');
    assert.equal(resolution.response.status, 'simulation_enabled');
    assert.equal(resolution.response.capabilities.planCode, planCode);
    assert.equal(resolution.response.capabilities.planSource, 'admin');
    assert.equal(resolution.response.capabilities.features.basicAnalytics, expected.basicAnalytics);
    assert.equal(
      resolution.response.capabilities.features.salesPhotoEvidence,
      expected.salesPhotoEvidence,
    );
    simulatedApiResponse = resolution.response;
  }

  assert.equal(resolveSubscriptionSimulationForRequest({
    request: new Request('https://app.example.test/api/account-capabilities'),
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    nowMs: NOW,
  }), null);
} finally {
  clearSubscriptionSimulation(OWNER_ID);
  if (originalEnabled === undefined) delete process.env.SUBSCRIPTION_SIMULATION_ENABLED;
  else process.env.SUBSCRIPTION_SIMULATION_ENABLED = originalEnabled;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
}

const parsedSimulatedCapability = parseAccountCapabilityApiSuccess(simulatedApiResponse);
assert.equal(parsedSimulatedCapability?.status, 'simulation_enabled');
assert.equal(parsedSimulatedCapability?.capabilities.planCode, 'team');

let routeState = clearSubscriptionSimulation(OWNER_ID);
const routeHandlers = createSubscriptionSimulationRouteHandlers({
  resolveActor: async () => ({ actorId: OWNER_ID }),
  readState: () => routeState,
  setState: (_actorId, planCode) => {
    routeState = {
      enabled: true,
      planCode,
      expiresAt: new Date(NOW + SUBSCRIPTION_SIMULATION_TTL_MS).toISOString(),
    };
    return routeState;
  },
  clearState: () => {
    routeState = { enabled: false, planCode: null, expiresAt: null };
    return routeState;
  },
  now: () => NOW,
});

const initialResponse = await routeHandlers.GET(
  new Request('http://localhost:3010/api/dev/subscription-simulation'),
);
assert.equal(initialResponse.status, 200);
assert.equal((await initialResponse.json() as { enabled: boolean }).enabled, false);

const invalidResponse = await routeHandlers.POST(new Request(
  'http://localhost:3010/api/dev/subscription-simulation',
  { method: 'POST', body: JSON.stringify({ enabled: true, planCode: 'enterprise' }) },
));
assert.equal(invalidResponse.status, 400);

const enabledResponse = await routeHandlers.POST(new Request(
  'http://localhost:3010/api/dev/subscription-simulation',
  { method: 'POST', body: JSON.stringify({ enabled: true, planCode: 'team' }) },
));
assert.equal(enabledResponse.status, 200);
assert.equal((await enabledResponse.json() as { planCode: string }).planCode, 'team');

const disabledResponse = await routeHandlers.POST(new Request(
  'http://localhost:3010/api/dev/subscription-simulation',
  { method: 'POST', body: JSON.stringify({ enabled: false }) },
));
assert.equal(disabledResponse.status, 200);
assert.equal((await disabledResponse.json() as { enabled: boolean }).enabled, false);

const authRequired = await createSubscriptionSimulationRouteHandlers({
  ...{
    readState: () => routeState,
    setState: () => routeState,
    clearState: () => routeState,
    now: () => NOW,
  },
  resolveActor: async () => null,
}).GET(new Request('http://localhost:3010/api/dev/subscription-simulation'));
assert.equal(authRequired.status, 401);

let requestedAuthorization = '';
const clientRead = await readSubscriptionSimulationClient({
  accessToken: 'verified-token',
  fetchImpl: (async (_input, init) => {
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
    return new Response(JSON.stringify({
      ok: true,
      available: true,
      enabled: true,
      planCode: 'pro',
      expiresAt: new Date(NOW + SUBSCRIPTION_SIMULATION_TTL_MS).toISOString(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch,
});
assert.equal(clientRead.ok, true);
assert.equal(requestedAuthorization, 'Bearer verified-token');

let requestedMethod = '';
let requestedBody = '';
const clientUpdate = await updateSubscriptionSimulation({
  accessToken: 'verified-token',
  enabled: true,
  planCode: 'team',
  fetchImpl: (async (_input, init) => {
    requestedMethod = init?.method ?? '';
    requestedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({
      ok: true,
      available: true,
      enabled: true,
      planCode: 'team',
      expiresAt: new Date(NOW + SUBSCRIPTION_SIMULATION_TTL_MS).toISOString(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch,
});
assert.equal(clientUpdate.ok, true);
assert.equal(requestedMethod, 'POST');
assert.deepEqual(JSON.parse(requestedBody), { enabled: true, planCode: 'team' });
assert.equal(getAccountCapabilitySourcePresentation('simulation_enabled').activePaidClaim, false);

const root = join(__dirname, '..');
const serverSource = readFileSync(
  join(root, 'lib/subscription/subscription-simulation.server.ts'),
  'utf8',
);
const accountRouteSource = readFileSync(join(root, 'app/api/account-capabilities/route.ts'), 'utf8');
const simulationRouteSource = readFileSync(
  join(root, 'app/api/dev/subscription-simulation/route.ts'),
  'utf8',
);
const panelSource = readFileSync(
  join(root, 'components/subscription/SubscriptionSimulationPanel.tsx'),
  'utf8',
);
const subscriptionPage = readFileSync(join(root, 'app/subscription/page.tsx'), 'utf8');
const simulationDoc = readFileSync(
  join(root, 'docs/subscription/LOCAL_SUBSCRIPTION_SIMULATION.md'),
  'utf8',
);
const implementationPlan = readFileSync(
  join(root, 'docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md'),
  'utf8',
);
const registry = readFileSync(
  join(root, 'docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md'),
  'utf8',
);
const testManifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(serverSource, /import 'server-only'/);
assert.match(serverSource, /SUBSCRIPTION_SIMULATION_ENABLED/);
assert.match(serverSource, /process\.env\.VERCEL/);
assert.doesNotMatch(serverSource, /localStorage|sessionStorage|NEXT_PUBLIC_|supabase|dexie/i);
assert.match(accountRouteSource, /resolveSubscriptionSimulationForRequest/);
assert.match(simulationRouteSource, /authenticateAppApiRequest/);
assert.match(simulationRouteSource, /isSubscriptionSimulationRequestAllowed/);
assert.doesNotMatch(simulationRouteSource, /subscription_accounts|SUPABASE_SECRET_KEY|service_role/i);
assert.match(panelSource, /role="switch"/);
assert.match(panelSource, /isOwner/);
assert.match(panelSource, /不修改付款與訂閱資料/);
assert.match(subscriptionPage, /SubscriptionSimulationPanel/);
assert.match(subscriptionPage, /isInternalTestSurfaceAvailable/);
assert.match(subscriptionPage, /showInternalTestTools &&/);
assert.doesNotMatch(subscriptionPage, /dynamic = 'force-dynamic'/);
assert.match(simulationDoc, /Never configure `SUBSCRIPTION_SIMULATION_ENABLED` in staging or production/);
assert.match(simulationDoc, /does\s+not authorize high-cost cloud writes/);
assert.match(implementationPlan, /Slice LV1: Local Subscription Identity Simulation/);
assert.match(registry, /`subscription\.local_simulation`/);
assert.match(testManifest, /tsx tests\/subscription-simulation\.test\.ts/);

console.log('PASS local subscription identity simulation safety and capability switching');
}

void main();
