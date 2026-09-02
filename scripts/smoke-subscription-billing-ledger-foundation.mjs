import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false, quiet: true });

if (!process.argv.includes('--execute=denial-only')) {
  throw new Error('execution_confirmation_required');
}

const requireAuthenticated = process.argv.includes('--require-authenticated');
const requiredEnvironment = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
];

for (const key of requiredEnvironment) {
  if (!process.env[key]?.trim()) throw new Error(`missing_environment:${key}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
const anonymousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverSecret = process.env.SUPABASE_SECRET_KEY;
const authenticatedEmail = process.env.SUBSCRIPTION_SMOKE_USER_EMAIL?.trim();
const authenticatedPassword = process.env.SUBSCRIPTION_SMOKE_USER_PASSWORD;
const missingRowId = '00000000-0000-0000-0000-000000000000';
const missingProviderRef = '__f3b_denial_smoke_missing__';
const results = [];
let failed = false;

function record(role, operation, status, detail) {
  results.push({ role, operation, status, detail });
  if (status === 'FAIL') failed = true;
}

async function readErrorCode(response) {
  try {
    const body = await response.json();
    return String(body?.code ?? 'none').slice(0, 40);
  } catch {
    return 'none';
  }
}

async function getAuthenticatedAccessToken() {
  if (!authenticatedEmail || !authenticatedPassword) {
    record(
      'authenticated',
      'password grant',
      requireAuthenticated ? 'FAIL' : 'SKIP',
      'set temporary subscription smoke credentials',
    );
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonymousKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: authenticatedEmail,
      password: authenticatedPassword,
    }),
  });
  const body = await response.json().catch(() => null);
  const token = body?.access_token;

  if (!response.ok || typeof token !== 'string' || token.length === 0) {
    record(
      'authenticated',
      'password grant',
      'FAIL',
      `denied: ${String(body?.error_code ?? body?.code ?? response.status).slice(0, 40)}`,
    );
    return null;
  }

  record('authenticated', 'password grant', 'PASS', 'session acquired without logging token');
  return token;
}

const tableFixtures = [
  {
    table: 'billing_customer_links',
    insertBody: {
      id: missingRowId,
      owner_id: missingRowId,
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      provider_customer_ref: missingProviderRef,
    },
    updateBody: { provider_customer_ref: missingProviderRef },
  },
  {
    table: 'billing_subscriptions',
    insertBody: {
      id: missingRowId,
      billing_customer_link_id: missingRowId,
      owner_id: missingRowId,
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      provider_subscription_ref: missingProviderRef,
      normalized_plan_code: 'pro',
      normalized_cadence: 'monthly',
      normalized_billing_status: 'unknown',
      provider_observed_at: '2000-01-01T00:00:00Z',
      snapshot_hash: '0'.repeat(64),
      last_reconciled_at: '2000-01-01T00:00:00Z',
    },
    updateBody: { normalized_billing_status: 'unknown' },
  },
  {
    table: 'billing_transactions',
    insertBody: {
      id: missingRowId,
      owner_id: missingRowId,
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      provider_transaction_ref: missingProviderRef,
      transaction_kind: 'charge',
      transaction_status: 'unknown',
      currency: 'TWD',
      amount_minor: 0,
      provider_effective_at: '2000-01-01T00:00:00Z',
      provider_observed_at: '2000-01-01T00:00:00Z',
      snapshot_hash: '0'.repeat(64),
    },
    updateBody: { transaction_status: 'unknown' },
  },
  {
    table: 'billing_event_inbox',
    insertBody: {
      id: missingRowId,
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      provider_event_ref: missingProviderRef,
      payload_hash: 'invalid_by_design',
      verification_status: 'pending',
      event_kind: 'denial_smoke',
      processing_status: 'pending',
    },
    updateBody: { verification_status: 'pending' },
  },
  {
    table: 'billing_reconciliation_runs',
    insertBody: {
      id: missingRowId,
      owner_id: missingRowId,
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      trigger_kind: 'scheduled',
      status: 'running',
      started_at: '2000-01-01T00:00:00Z',
    },
    updateBody: { status: 'running' },
  },
];

const tableProbes = tableFixtures.flatMap(fixture => [
  {
    operation: `select ${fixture.table}`,
    method: 'GET',
    table: fixture.table,
    query: '?select=id&limit=1',
  },
  {
    operation: `insert ${fixture.table}`,
    method: 'POST',
    table: fixture.table,
    body: fixture.insertBody,
  },
  {
    operation: `update ${fixture.table}`,
    method: 'PATCH',
    table: fixture.table,
    query: `?id=eq.${missingRowId}`,
    body: fixture.updateBody,
  },
  {
    operation: `delete ${fixture.table}`,
    method: 'DELETE',
    table: fixture.table,
    query: `?id=eq.${missingRowId}`,
  },
]);

const triggerFunctions = [
  'reject_billing_customer_link_mutation',
  'enforce_billing_subscription_snapshot_write',
  'prevent_f3b_billing_ledger_delete',
  'enforce_billing_transaction_write',
  'enforce_billing_event_inbox_write',
  'enforce_billing_reconciliation_run_write',
];

async function runTableProbes(role, apiKey, bearerToken) {
  for (const probe of tableProbes) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${probe.table}${probe.query ?? ''}`,
      {
        method: probe.method,
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${bearerToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: probe.body === undefined ? undefined : JSON.stringify(probe.body),
      },
    );
    const errorCode = await readErrorCode(response);
    const denied = !response.ok && errorCode === '42501';
    record(
      role,
      probe.operation,
      denied ? 'PASS' : 'FAIL',
      denied ? `denied: ${response.status}/${errorCode}` : `unexpected: ${response.status}/${errorCode}`,
    );
  }
}

async function runFunctionProbes(role, apiKey, bearerToken) {
  for (const functionName of triggerFunctions) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${bearerToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const errorCode = await readErrorCode(response);
    const denied = !response.ok
      && [401, 403, 404].includes(response.status)
      && ['42501', 'PGRST202'].includes(errorCode);
    record(
      role,
      `execute ${functionName}`,
      denied ? 'PASS' : 'FAIL',
      denied ? `denied: ${response.status}/${errorCode}` : `unexpected: ${response.status}/${errorCode}`,
    );
  }
}

const authenticatedToken = await getAuthenticatedAccessToken();
const credentials = [
  { role: 'anonymous', apiKey: anonymousKey, bearerToken: anonymousKey },
  { role: 'server secret', apiKey: serverSecret, bearerToken: serverSecret },
];
if (authenticatedToken) {
  credentials.splice(1, 0, {
    role: 'authenticated',
    apiKey: anonymousKey,
    bearerToken: authenticatedToken,
  });
}

for (const credential of credentials) {
  await runTableProbes(credential.role, credential.apiKey, credential.bearerToken);
  await runFunctionProbes(credential.role, credential.apiKey, credential.bearerToken);
}

console.table(results);
if (failed) process.exit(1);
