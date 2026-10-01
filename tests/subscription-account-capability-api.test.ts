import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createAccountCapabilityRouteHandlers,
  OPTIONS,
  maxDuration,
  runtime,
} from '../app/api/account-capabilities/route';
import { readAccountCapabilities } from '../lib/subscription/account-capability-client';
import {
  ACCOUNT_CAPABILITY_REFRESH_TTL_MS,
  resolveServerAccountCapabilities,
  type AccountCapabilityLookupResult,
  type AccountCapabilityRepository,
  type SubscriptionAccountRecord,
} from '../lib/subscription/account-capability-server';
import { getAccountCapabilitySourcePresentation } from '../lib/subscription/subscription-presentation';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000003';
const NOW = Date.parse('2026-07-29T12:00:00.000Z');

function account(overrides: Partial<SubscriptionAccountRecord> = {}): SubscriptionAccountRecord {
  return {
    ownerId: OWNER_ID,
    planCode: 'free',
    planSource: 'free',
    billingStatus: 'none',
    entitlementStatus: 'active',
    entitlementEndsAt: null,
    updatedAt: '2026-07-29T11:00:00.000Z',
    ...overrides,
  };
}

function repository(result: AccountCapabilityLookupResult): AccountCapabilityRepository {
  return { readForActor: async () => result };
}

async function resolve(result: AccountCapabilityLookupResult) {
  return resolveServerAccountCapabilities({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    repository: repository(result),
    nowMs: NOW,
  });
}

async function main(): Promise<void> {
  const missing = await resolve({ access: 'allowed', account: null });
  assert.equal(missing.outcome, 'available');
  if (missing.outcome !== 'available') throw new Error('missing account must resolve');
  assert.equal(missing.response.status, 'default_free');
  assert.equal(missing.response.capabilities.planCode, 'free');
  assert.equal(missing.response.capabilities.features.productCoverPhoto, false);
  assert.equal(missing.response.capabilities.features.basicAnalytics, false);
  assert.equal(
    Date.parse(missing.response.capabilities.capabilityRefreshAfter ?? '') - NOW,
    ACCOUNT_CAPABILITY_REFRESH_TTL_MS,
  );

  const explicitFree = await resolve({ access: 'allowed', account: account() });
  assert.equal(explicitFree.outcome === 'available' ? explicitFree.response.status : null, 'explicit_free');

  const adminPro = await resolve({
    access: 'allowed',
    account: account({
      planCode: 'pro',
      planSource: 'admin',
      entitlementEndsAt: '2026-08-29T12:00:00.000Z',
    }),
  });
  assert.equal(adminPro.outcome, 'available');
  if (adminPro.outcome !== 'available') throw new Error('admin Pro must resolve');
  assert.equal(adminPro.response.status, 'admin_enabled');
  assert.equal(adminPro.response.capabilities.features.productCoverPhoto, true);
  assert.equal(adminPro.response.capabilities.features.basicAnalytics, true);
  assert.equal(adminPro.response.capabilities.features.salesPhotoEvidence, false);

  const adminTeam = await resolve({
    access: 'allowed',
    account: account({
      planCode: 'team',
      planSource: 'admin',
      entitlementEndsAt: null,
    }),
  });
  assert.equal(adminTeam.outcome, 'available');
  if (adminTeam.outcome !== 'available') throw new Error('admin Team must resolve');
  assert.equal(adminTeam.response.capabilities.features.salesPhotoEvidence, true);
  assert.equal(adminTeam.response.capabilities.features.managerWorkflow, true);

  const inactiveAdmin = await resolve({
    access: 'allowed',
    account: account({
      planCode: 'pro',
      planSource: 'admin',
      entitlementEndsAt: '2026-07-28T12:00:00.000Z',
    }),
  });
  assert.equal(inactiveAdmin.outcome === 'available' ? inactiveAdmin.response.status : null, 'admin_inactive');

  const explicitlyInactiveAdmin = await resolve({
    access: 'allowed',
    account: account({
      planCode: 'team',
      planSource: 'admin',
      entitlementStatus: 'inactive',
      entitlementEndsAt: null,
    }),
  });
  assert.equal(
    explicitlyInactiveAdmin.outcome === 'available' ? explicitlyInactiveAdmin.response.status : null,
    'admin_inactive',
  );

  const billingDisconnected = await resolve({
    access: 'allowed',
    account: account({
      planCode: 'team',
      planSource: 'billing',
      billingStatus: 'active',
    }),
  });
  assert.equal(
    billingDisconnected.outcome === 'available' ? billingDisconnected.response.status : null,
    'billing_not_connected',
  );
  if (billingDisconnected.outcome !== 'available') throw new Error('billing fallback must resolve');
  assert.equal(billingDisconnected.response.capabilities.planCode, 'free');
  assert.equal(billingDisconnected.response.capabilities.features.staffCollaboration, false);

  const promotionDisconnected = await resolve({
    access: 'allowed',
    account: account({
      planCode: 'pro',
      planSource: 'promotion',
      entitlementEndsAt: '2026-08-05T12:00:00.000Z',
    }),
  });
  assert.equal(
    promotionDisconnected.outcome === 'available' ? promotionDisconnected.response.status : null,
    'promotion_not_connected',
  );
  if (promotionDisconnected.outcome !== 'available') {
    throw new Error('promotion fallback must resolve');
  }
  assert.equal(promotionDisconnected.response.capabilities.planCode, 'free');
  assert.equal(promotionDisconnected.response.capabilities.features.productCoverPhoto, false);

  const malformed = await resolve({
    access: 'allowed',
    account: account({ planCode: 'enterprise' }),
  });
  assert.equal(malformed.outcome, 'unavailable');
  assert.equal((await resolve({ access: 'forbidden' })).outcome, 'forbidden');
  const failedRepository: AccountCapabilityRepository = {
    readForActor: async () => { throw new Error('database unavailable'); },
  };
  assert.equal((await resolveServerAccountCapabilities({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    repository: failedRepository,
    nowMs: NOW,
  })).outcome, 'unavailable');

  assert.equal(runtime, 'nodejs');
  assert.equal(maxDuration, 5);
  const handlers = createAccountCapabilityRouteHandlers({
    resolveActor: async () => ({ actorId: OWNER_ID }),
    resolveCapabilities: async input => {
      assert.equal(input.actorId, OWNER_ID);
      assert.equal(input.ownerId, OWNER_ID);
      assert.equal(input.request.url, 'https://app.example.test/api/account-capabilities');
      return adminTeam;
    },
  });
  const routeSuccess = await handlers.GET(new Request('https://app.example.test/api/account-capabilities'));
  assert.equal(routeSuccess.status, 200);
  assert.equal(routeSuccess.headers.get('Cache-Control'), 'no-store');
  assert.equal((await routeSuccess.json() as { status: string }).status, 'admin_enabled');

  const invalidActor = await createAccountCapabilityRouteHandlers({
    resolveActor: async () => ({ actorId: 'not-a-uuid' }),
    resolveCapabilities: async () => adminTeam,
  }).GET(new Request('https://app.example.test/api/account-capabilities'));
  assert.equal(invalidActor.status, 503);

  const authRequired = await createAccountCapabilityRouteHandlers({
    resolveActor: async () => null,
    resolveCapabilities: async () => adminTeam,
  }).GET(new Request('https://app.example.test/api/account-capabilities'));
  assert.equal(authRequired.status, 401);

  const forbidden = await createAccountCapabilityRouteHandlers({
    resolveActor: async () => ({ actorId: OTHER_OWNER_ID }),
    resolveCapabilities: async () => ({ outcome: 'forbidden' }),
  }).GET(new Request('https://app.example.test/api/account-capabilities'));
  assert.equal(forbidden.status, 403);

  const originalAllowedOrigins = process.env.APP_API_CORS_ALLOWED_ORIGINS;
  process.env.APP_API_CORS_ALLOWED_ORIGINS = 'capacitor://localhost';
  try {
    const preflight = OPTIONS(new Request('https://api.example.test/api/account-capabilities', {
      method: 'OPTIONS',
      headers: {
        Origin: 'capacitor://localhost',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization',
      },
    }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
    assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
    assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null);
  } finally {
    if (originalAllowedOrigins === undefined) {
      delete process.env.APP_API_CORS_ALLOWED_ORIGINS;
    } else {
      process.env.APP_API_CORS_ALLOWED_ORIGINS = originalAllowedOrigins;
    }
  }

  let requestedUrl = '';
  let requestedAuthorization = '';
  const clientResult = await readAccountCapabilities({
    accessToken: 'verified-token',
    nowMs: NOW,
    apiUrl: {
      configuredBaseUrl: 'https://api.example.test/v1',
      buildTarget: 'mobile',
      runtimeProtocol: 'capacitor:',
    },
    fetchImpl: (async (input, init) => {
      requestedUrl = String(input);
      requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(JSON.stringify(adminPro.response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });
  assert.equal(clientResult.ok, true);
  assert.equal(requestedUrl, 'https://api.example.test/v1/api/account-capabilities');
  assert.equal(requestedAuthorization, 'Bearer verified-token');

  const staleClientResult = await readAccountCapabilities({
    accessToken: 'verified-token',
    nowMs: NOW + ACCOUNT_CAPABILITY_REFRESH_TTL_MS + 1,
    apiUrl: { configuredBaseUrl: 'https://api.example.test' },
    fetchImpl: (async () => new Response(JSON.stringify(adminPro.response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch,
  });
  assert.equal(staleClientResult.ok, false);
  assert.equal(staleClientResult.ok ? null : staleClientResult.code, 'stale_capability');
  assert.equal(staleClientResult.capabilities.features.productCoverPhoto, false);

  assert.equal(getAccountCapabilitySourcePresentation('admin_enabled').activePaidClaim, true);
  assert.equal(getAccountCapabilitySourcePresentation('simulation_enabled').activePaidClaim, false);
  assert.equal(getAccountCapabilitySourcePresentation('billing_not_connected').activePaidClaim, false);
  assert.equal(getAccountCapabilitySourcePresentation('unavailable').activePaidClaim, false);

  const root = join(__dirname, '..');
  const routeSource = readFileSync(join(root, 'app/api/account-capabilities/route.ts'), 'utf8');
  const clientSource = readFileSync(join(root, 'lib/subscription/account-capability-client.ts'), 'utf8');
  const storageSource = readFileSync(join(root, 'lib/subscription/account-capability-storage.server.ts'), 'utf8');
  const migration = readFileSync(join(root, 'supabase/migrations/063_add_subscription_accounts.sql'), 'utf8');

  assert.doesNotMatch(routeSource, /export const (?:POST|PUT|PATCH|DELETE)\b/);
  assert.doesNotMatch(routeSource, /searchParams|ownerId=.*(?:query|param)/i);
  assert.doesNotMatch(routeSource, /searchParams\.get\(['"](?:plan|tier)|localStorage|sessionStorage|NEXT_PUBLIC_(?:PLAN|TIER)/i);
  assert.doesNotMatch(clientSource, /supabase|localStorage|sessionStorage|window\.|document\.|navigator\.|@capacitor/i);
  assert.match(clientSource, /buildAppApiUrl/);
  assert.match(storageSource, /import 'server-only'/);
  assert.match(storageSource, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(storageSource, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_(?:PLAN|TIER)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.subscription_accounts/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON public\.subscription_accounts FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /read_subscription_account_for_actor/i);
  assert.match(migration, /sr\.status = 'active'/i);
  assert.match(migration, /GRANT EXECUTE[\s\S]+TO service_role/i);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE|ALL)[^;]+authenticated/i);

  console.log('PASS S4 authoritative account capability read model and API');
}

void main();
