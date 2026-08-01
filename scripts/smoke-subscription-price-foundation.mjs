import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false, quiet: true });

const requireAuthenticated = process.argv.includes('--require-authenticated');
const requiredEnvironment = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
];

for (const key of requiredEnvironment) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const anonymousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverSecret = process.env.SUPABASE_SECRET_KEY;
const authenticatedEmail = process.env.SUBSCRIPTION_SMOKE_USER_EMAIL?.trim();
const authenticatedPassword = process.env.SUBSCRIPTION_SMOKE_USER_PASSWORD;
const missingRowId = '00000000-0000-0000-0000-000000000000';

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
      'set SUBSCRIPTION_SMOKE_USER_EMAIL and SUBSCRIPTION_SMOKE_USER_PASSWORD',
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

const tableProbes = [
  {
    operation: 'select subscription_price_versions',
    method: 'GET',
    table: 'subscription_price_versions',
    query: '?select=id&limit=1',
  },
  {
    operation: 'insert subscription_price_versions',
    method: 'POST',
    table: 'subscription_price_versions',
    body: {
      id: 'pro_monthly_twd_launch_v1',
      plan_code: 'pro',
      cadence: 'monthly',
      currency: 'TWD',
      amount_minor: 199,
      price_policy: 'standard',
      commercial_status: 'candidate',
    },
  },
  {
    operation: 'update subscription_price_versions',
    method: 'PATCH',
    table: 'subscription_price_versions',
    query: '?id=eq.__denial_smoke_missing__',
    body: { commercial_status: 'candidate' },
  },
  {
    operation: 'delete subscription_price_versions',
    method: 'DELETE',
    table: 'subscription_price_versions',
    query: '?id=eq.__denial_smoke_missing__',
  },
  {
    operation: 'select billing_storefront_price_mappings',
    method: 'GET',
    table: 'billing_storefront_price_mappings',
    query: '?select=id&limit=1',
  },
  {
    operation: 'insert billing_storefront_price_mappings',
    method: 'POST',
    table: 'billing_storefront_price_mappings',
    body: {
      id: missingRowId,
      price_version_id: '__denial_smoke_missing__',
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      mapping_mode: 'server_amount',
      mapping_status: 'candidate',
    },
  },
  {
    operation: 'update billing_storefront_price_mappings',
    method: 'PATCH',
    table: 'billing_storefront_price_mappings',
    query: `?id=eq.${missingRowId}`,
    body: { mapping_status: 'candidate' },
  },
  {
    operation: 'delete billing_storefront_price_mappings',
    method: 'DELETE',
    table: 'billing_storefront_price_mappings',
    query: `?id=eq.${missingRowId}`,
  },
  {
    operation: 'select subscription_price_assignments',
    method: 'GET',
    table: 'subscription_price_assignments',
    query: '?select=id&limit=1',
  },
  {
    operation: 'insert subscription_price_assignments',
    method: 'POST',
    table: 'subscription_price_assignments',
    body: {
      id: missingRowId,
      owner_id: missingRowId,
      storefront_price_mapping_id: missingRowId,
      price_version_id: '__denial_smoke_missing__',
      assigned_plan_code: 'pro',
      assigned_cadence: 'monthly',
      assigned_currency: 'TWD',
      assigned_amount_minor: 199,
      price_policy: 'standard',
      assignment_source: 'migration',
      source_reference: 'denial-smoke',
      continuity_started_at: '2000-01-01T00:00:00Z',
      assigned_at: '2000-01-01T00:00:00Z',
      last_transition_at: '2000-01-01T00:00:00Z',
      last_transition_reason: 'denial-smoke',
      last_transition_evidence_reference: 'denial-smoke',
    },
  },
  {
    operation: 'update subscription_price_assignments',
    method: 'PATCH',
    table: 'subscription_price_assignments',
    query: `?id=eq.${missingRowId}`,
    body: { last_transition_reason: 'denial-smoke' },
  },
  {
    operation: 'delete subscription_price_assignments',
    method: 'DELETE',
    table: 'subscription_price_assignments',
    query: `?id=eq.${missingRowId}`,
  },
];

const triggerFunctions = [
  'enforce_subscription_price_version_update',
  'enforce_billing_storefront_mapping_update',
  'enforce_subscription_price_assignment_write',
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
